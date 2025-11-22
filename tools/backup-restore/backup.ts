#!/usr/bin/env tsx

/**
 * Backup Utility
 *
 * Backs up critical data from Supabase to local files or cloud storage.
 * Supports incremental and full backups.
 *
 * Usage:
 *   npx tsx tools/backup-restore/backup.ts [options]
 *
 * Options:
 *   --type <full|incremental>   Backup type (default: full)
 *   --output <path>             Output directory (default: ./backups)
 *   --tables <table1,table2>    Specific tables to backup (default: all)
 *   --since <date>              For incremental: backup data since this date
 *   --compress                  Compress backup files
 */

import { supabase } from '../../infra/supabase/client'
import { logger } from '../../shared/libs/logger'
import * as fs from 'fs'
import * as path from 'path'
import { program } from 'commander'

interface BackupOptions {
  type: 'full' | 'incremental'
  output: string
  tables?: string[]
  since?: Date
  compress: boolean
}

interface BackupResult {
  success: boolean
  timestamp: Date
  tables: Array<{
    name: string
    rows: number
    size: number
    file: string
  }>
  totalRows: number
  totalSize: number
  duration: number
}

/**
 * Default tables to backup
 */
const DEFAULT_TABLES = [
  'businesses',
  'integration_logs',
  'workflow_execution_logs',
  'api_metrics'
]

/**
 * Backup Manager
 */
class BackupManager {
  /**
   * Create a backup
   */
  async createBackup(options: BackupOptions): Promise<BackupResult> {
    const startTime = Date.now()
    const timestamp = new Date()
    const tables = options.tables || DEFAULT_TABLES

    logger.info('Starting backup', {
      source: 'backup',
      metadata: {
        type: options.type,
        tables: tables.length,
        since: options.since?.toISOString()
      }
    })

    // Create output directory
    const backupDir = path.join(
      options.output,
      `backup-${timestamp.toISOString().replace(/:/g, '-').split('.')[0]}`
    )

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const result: BackupResult = {
      success: true,
      timestamp,
      tables: [],
      totalRows: 0,
      totalSize: 0,
      duration: 0
    }

    // Backup each table
    for (const table of tables) {
      try {
        const tableResult = await this.backupTable(table, backupDir, options)
        result.tables.push(tableResult)
        result.totalRows += tableResult.rows
        result.totalSize += tableResult.size
      } catch (error) {
        logger.error(`Failed to backup table: ${table}`, {
          source: 'backup',
          metadata: { table, error: error instanceof Error ? error.message : String(error) }
        }, error as Error)
        result.success = false
      }
    }

    // Create metadata file
    const metadataFile = path.join(backupDir, 'metadata.json')
    fs.writeFileSync(
      metadataFile,
      JSON.stringify(
        {
          timestamp: timestamp.toISOString(),
          type: options.type,
          tables: result.tables,
          totalRows: result.totalRows,
          totalSize: result.totalSize
        },
        null,
        2
      )
    )

    result.duration = Date.now() - startTime

    logger.info('Backup completed', {
      source: 'backup',
      metadata: {
        success: result.success,
        tables: result.tables.length,
        totalRows: result.totalRows,
        totalSize: result.totalSize,
        duration: result.duration
      }
    })

    return result
  }

  /**
   * Backup a single table
   */
  private async backupTable(
    tableName: string,
    outputDir: string,
    options: BackupOptions
  ): Promise<{ name: string; rows: number; size: number; file: string }> {
    logger.info(`Backing up table: ${tableName}`, {
      source: 'backup',
      metadata: { table: tableName }
    })

    let query = supabase.from(tableName).select('*')

    // For incremental backups, filter by date
    if (options.type === 'incremental' && options.since) {
      // Assume tables have created_at or updated_at
      query = query.or(
        `created_at.gte.${options.since.toISOString()},updated_at.gte.${options.since.toISOString()}`
      )
    }

    // Fetch all data (with pagination for large tables)
    const allData: any[] = []
    let hasMore = true
    let offset = 0
    const limit = 1000

    while (hasMore) {
      const { data, error } = await query.range(offset, offset + limit - 1)

      if (error) {
        throw new Error(`Failed to fetch data from ${tableName}: ${error.message}`)
      }

      if (!data || data.length === 0) {
        hasMore = false
      } else {
        allData.push(...data)
        offset += limit

        if (data.length < limit) {
          hasMore = false
        }
      }
    }

    // Write to file
    const filename = `${tableName}.json`
    const filepath = path.join(outputDir, filename)

    const jsonContent = JSON.stringify(allData, null, 2)
    fs.writeFileSync(filepath, jsonContent)

    const size = Buffer.byteLength(jsonContent)

    logger.info(`Table backup completed: ${tableName}`, {
      source: 'backup',
      metadata: { table: tableName, rows: allData.length, size }
    })

    return {
      name: tableName,
      rows: allData.length,
      size,
      file: filepath
    }
  }

  /**
   * List available backups
   */
  listBackups(backupDir: string): Array<{
    path: string
    timestamp: Date
    type: string
    tables: number
    totalRows: number
  }> {
    if (!fs.existsSync(backupDir)) {
      return []
    }

    const backups: Array<{
      path: string
      timestamp: Date
      type: string
      tables: number
      totalRows: number
    }> = []

    const dirs = fs.readdirSync(backupDir)

    for (const dir of dirs) {
      if (!dir.startsWith('backup-')) continue

      const backupPath = path.join(backupDir, dir)
      const metadataPath = path.join(backupPath, 'metadata.json')

      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))

        backups.push({
          path: backupPath,
          timestamp: new Date(metadata.timestamp),
          type: metadata.type,
          tables: metadata.tables.length,
          totalRows: metadata.totalRows
        })
      }
    }

    // Sort by timestamp descending
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return backups
  }
}

/**
 * CLI Interface
 */
async function main() {
  program
    .option('--type <type>', 'Backup type (full|incremental)', 'full')
    .option('--output <path>', 'Output directory', './backups')
    .option('--tables <tables>', 'Comma-separated list of tables to backup')
    .option('--since <date>', 'For incremental backups: backup data since this date')
    .option('--compress', 'Compress backup files (not implemented yet)', false)
    .option('--list', 'List available backups', false)
    .parse()

  const opts = program.opts()

  const backupManager = new BackupManager()

  // List backups
  if (opts.list) {
    console.log('📋 Available Backups:\n')

    const backups = backupManager.listBackups(opts.output)

    if (backups.length === 0) {
      console.log('No backups found.')
      return
    }

    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.timestamp.toISOString()}`)
      console.log(`   Type: ${backup.type}`)
      console.log(`   Tables: ${backup.tables}`)
      console.log(`   Total Rows: ${backup.totalRows}`)
      console.log(`   Path: ${backup.path}`)
      console.log('')
    })

    return
  }

  // Create backup
  const options: BackupOptions = {
    type: opts.type as 'full' | 'incremental',
    output: opts.output,
    tables: opts.tables ? opts.tables.split(',') : undefined,
    since: opts.since ? new Date(opts.since) : undefined,
    compress: opts.compress
  }

  console.log(`🔄 Creating ${options.type} backup...\n`)

  const result = await backupManager.createBackup(options)

  if (result.success) {
    console.log('✅ Backup completed successfully!\n')
  } else {
    console.log('⚠️  Backup completed with errors\n')
  }

  console.log('📊 Backup Summary:')
  console.log(`   Timestamp: ${result.timestamp.toISOString()}`)
  console.log(`   Type: ${options.type}`)
  console.log(`   Tables: ${result.tables.length}`)
  console.log(`   Total Rows: ${result.totalRows}`)
  console.log(`   Total Size: ${(result.totalSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`)
  console.log('')

  console.log('📁 Backup Files:')
  result.tables.forEach(table => {
    console.log(`   - ${table.name}: ${table.rows} rows, ${(table.size / 1024).toFixed(2)} KB`)
  })
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Backup failed:', error)
    logger.error('Backup failed', {
      source: 'backup',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    }, error as Error)
    process.exit(1)
  })
}

export { BackupManager }
