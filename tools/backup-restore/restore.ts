#!/usr/bin/env tsx

/**
 * Restore Utility
 *
 * Restores data from backup files to Supabase.
 * Supports full and selective table restoration.
 *
 * Usage:
 *   npx tsx tools/backup-restore/restore.ts [options]
 *
 * Options:
 *   --backup <path>             Path to backup directory (required)
 *   --tables <table1,table2>    Specific tables to restore (default: all)
 *   --dry-run                   Show what would be restored without doing it
 *   --overwrite                 Overwrite existing data (default: skip)
 *   --batch-size <n>            Batch size for inserts (default: 100)
 */

import { supabase } from '../../infra/supabase/client'
import { logger } from '../../shared/libs/logger'
import * as fs from 'fs'
import * as path from 'path'
import { program } from 'commander'

interface RestoreOptions {
  backup: string
  tables?: string[]
  dryRun: boolean
  overwrite: boolean
  batchSize: number
}

interface RestoreResult {
  success: boolean
  timestamp: Date
  tables: Array<{
    name: string
    rowsRestored: number
    rowsSkipped: number
    errors: number
  }>
  totalRowsRestored: number
  totalRowsSkipped: number
  totalErrors: number
  duration: number
}

/**
 * Restore Manager
 */
class RestoreManager {
  /**
   * Restore from backup
   */
  async restoreFromBackup(options: RestoreOptions): Promise<RestoreResult> {
    const startTime = Date.now()
    const timestamp = new Date()

    logger.info('Starting restore', {
      source: 'restore',
      metadata: {
        backup: options.backup,
        dryRun: options.dryRun,
        overwrite: options.overwrite
      }
    })

    // Verify backup directory exists
    if (!fs.existsSync(options.backup)) {
      throw new Error(`Backup directory not found: ${options.backup}`)
    }

    // Read metadata
    const metadataPath = path.join(options.backup, 'metadata.json')
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Backup metadata not found: ${metadataPath}`)
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))

    // Determine which tables to restore
    const tablesToRestore = options.tables || metadata.tables.map((t: any) => t.name)

    const result: RestoreResult = {
      success: true,
      timestamp,
      tables: [],
      totalRowsRestored: 0,
      totalRowsSkipped: 0,
      totalErrors: 0,
      duration: 0
    }

    // Restore each table
    for (const tableName of tablesToRestore) {
      try {
        const tableResult = await this.restoreTable(tableName, options)
        result.tables.push(tableResult)
        result.totalRowsRestored += tableResult.rowsRestored
        result.totalRowsSkipped += tableResult.rowsSkipped
        result.totalErrors += tableResult.errors
      } catch (error) {
        logger.error(`Failed to restore table: ${tableName}`, {
          source: 'restore',
          metadata: { table: tableName, error: error instanceof Error ? error.message : String(error) }
        }, error as Error)
        result.success = false
        result.totalErrors++
      }
    }

    result.duration = Date.now() - startTime

    logger.info('Restore completed', {
      source: 'restore',
      metadata: {
        success: result.success,
        tables: result.tables.length,
        totalRowsRestored: result.totalRowsRestored,
        totalRowsSkipped: result.totalRowsSkipped,
        totalErrors: result.totalErrors,
        duration: result.duration
      }
    })

    return result
  }

  /**
   * Restore a single table
   */
  private async restoreTable(
    tableName: string,
    options: RestoreOptions
  ): Promise<{ name: string; rowsRestored: number; rowsSkipped: number; errors: number }> {
    logger.info(`Restoring table: ${tableName}`, {
      source: 'restore',
      metadata: { table: tableName, dryRun: options.dryRun }
    })

    // Read backup file
    const backupFile = path.join(options.backup, `${tableName}.json`)

    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found for table: ${tableName}`)
    }

    const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'))

    if (!Array.isArray(data)) {
      throw new Error(`Invalid backup file format for table: ${tableName}`)
    }

    let rowsRestored = 0
    let rowsSkipped = 0
    let errors = 0

    if (options.dryRun) {
      logger.info(`Dry run: Would restore ${data.length} rows to ${tableName}`, {
        source: 'restore',
        metadata: { table: tableName, rows: data.length }
      })
      return { name: tableName, rowsRestored: data.length, rowsSkipped: 0, errors: 0 }
    }

    // Process in batches
    const batchSize = options.batchSize
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)

      try {
        if (options.overwrite) {
          // Upsert (insert or update)
          const { error } = await supabase.from(tableName).upsert(batch)

          if (error) {
            logger.error(`Failed to upsert batch to ${tableName}`, {
              source: 'restore',
              metadata: { table: tableName, batchStart: i, error: error.message }
            }, new Error(error.message))
            errors += batch.length
          } else {
            rowsRestored += batch.length
          }
        } else {
          // Insert only (skip if exists)
          const { error } = await supabase.from(tableName).insert(batch)

          if (error) {
            // Check if error is due to duplicate key
            if (error.code === '23505') {
              // Unique constraint violation - skip these rows
              rowsSkipped += batch.length
            } else {
              logger.error(`Failed to insert batch to ${tableName}`, {
                source: 'restore',
                metadata: { table: tableName, batchStart: i, error: error.message }
              }, new Error(error.message))
              errors += batch.length
            }
          } else {
            rowsRestored += batch.length
          }
        }
      } catch (error) {
        logger.error(`Error processing batch for ${tableName}`, {
          source: 'restore',
          metadata: { table: tableName, batchStart: i, error: error instanceof Error ? error.message : String(error) }
        }, error as Error)
        errors += batch.length
      }
    }

    logger.info(`Table restore completed: ${tableName}`, {
      source: 'restore',
      metadata: { table: tableName, rowsRestored, rowsSkipped, errors }
    })

    return { name: tableName, rowsRestored, rowsSkipped, errors }
  }

  /**
   * Verify backup integrity
   */
  verifyBackup(backupPath: string): {
    valid: boolean
    issues: string[]
    metadata?: any
  } {
    const issues: string[] = []

    // Check if directory exists
    if (!fs.existsSync(backupPath)) {
      return { valid: false, issues: ['Backup directory does not exist'] }
    }

    // Check for metadata file
    const metadataPath = path.join(backupPath, 'metadata.json')
    if (!fs.existsSync(metadataPath)) {
      issues.push('Metadata file missing')
      return { valid: false, issues }
    }

    // Parse metadata
    let metadata: any
    try {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
    } catch (error) {
      issues.push('Failed to parse metadata file')
      return { valid: false, issues }
    }

    // Verify all table files exist
    if (metadata.tables && Array.isArray(metadata.tables)) {
      for (const table of metadata.tables) {
        const tablePath = path.join(backupPath, `${table.name}.json`)
        if (!fs.existsSync(tablePath)) {
          issues.push(`Missing backup file for table: ${table.name}`)
        }
      }
    } else {
      issues.push('Metadata does not contain table information')
    }

    return {
      valid: issues.length === 0,
      issues,
      metadata: issues.length === 0 ? metadata : undefined
    }
  }
}

/**
 * CLI Interface
 */
async function main() {
  program
    .requiredOption('--backup <path>', 'Path to backup directory')
    .option('--tables <tables>', 'Comma-separated list of tables to restore')
    .option('--dry-run', 'Show what would be restored without doing it', false)
    .option('--overwrite', 'Overwrite existing data', false)
    .option('--batch-size <n>', 'Batch size for inserts', '100')
    .option('--verify', 'Verify backup integrity only', false)
    .parse()

  const opts = program.opts()

  const restoreManager = new RestoreManager()

  // Verify backup
  if (opts.verify) {
    console.log('🔍 Verifying backup integrity...\n')

    const verification = restoreManager.verifyBackup(opts.backup)

    if (verification.valid) {
      console.log('✅ Backup is valid\n')
      console.log('📊 Backup Metadata:')
      console.log(`   Timestamp: ${verification.metadata.timestamp}`)
      console.log(`   Type: ${verification.metadata.type}`)
      console.log(`   Tables: ${verification.metadata.tables.length}`)
      console.log(`   Total Rows: ${verification.metadata.totalRows}`)
      console.log('')

      console.log('📁 Tables:')
      verification.metadata.tables.forEach((table: any) => {
        console.log(`   - ${table.name}: ${table.rows} rows`)
      })
    } else {
      console.log('❌ Backup verification failed\n')
      console.log('Issues:')
      verification.issues.forEach(issue => {
        console.log(`   - ${issue}`)
      })
      process.exit(1)
    }

    return
  }

  // Restore from backup
  const options: RestoreOptions = {
    backup: opts.backup,
    tables: opts.tables ? opts.tables.split(',') : undefined,
    dryRun: opts.dryRun,
    overwrite: opts.overwrite,
    batchSize: parseInt(opts.batchSize, 10)
  }

  console.log(`🔄 ${options.dryRun ? 'Dry run: ' : ''}Restoring from backup...\n`)

  if (!options.dryRun && !options.overwrite) {
    console.log('⚠️  Running in insert-only mode (will skip existing records)')
    console.log('   Use --overwrite to update existing records\n')
  }

  const result = await restoreManager.restoreFromBackup(options)

  if (result.success) {
    console.log('✅ Restore completed successfully!\n')
  } else {
    console.log('⚠️  Restore completed with errors\n')
  }

  console.log('📊 Restore Summary:')
  console.log(`   Tables: ${result.tables.length}`)
  console.log(`   Rows Restored: ${result.totalRowsRestored}`)
  console.log(`   Rows Skipped: ${result.totalRowsSkipped}`)
  console.log(`   Errors: ${result.totalErrors}`)
  console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`)
  console.log('')

  console.log('📁 Table Details:')
  result.tables.forEach(table => {
    const status = table.errors > 0 ? '⚠️' : '✅'
    console.log(`   ${status} ${table.name}:`)
    console.log(`      Restored: ${table.rowsRestored}`)
    if (table.rowsSkipped > 0) {
      console.log(`      Skipped: ${table.rowsSkipped}`)
    }
    if (table.errors > 0) {
      console.log(`      Errors: ${table.errors}`)
    }
  })
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Restore failed:', error)
    logger.error('Restore failed', {
      source: 'restore',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    }, error as Error)
    process.exit(1)
  })
}

export { RestoreManager }
