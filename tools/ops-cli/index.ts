#!/usr/bin/env tsx
/**
 * Master-Ops CLI
 *
 * Command-line interface for common operations and tasks.
 *
 * Usage:
 *   ops --help
 *   ops health-check
 *   ops test-integration <service>
 *   ops logs --source=hubspot --tail
 *
 * Installation:
 *   npm link (or add alias: alias ops='npx tsx tools/ops-cli/index.ts')
 */

import { Command } from 'commander'
import { IntegrationHealthCheck } from '../health-checks/integration-health-check'
import { serviceClient } from '../../infra/supabase/client'
import { logger } from '../../shared/libs/logger'

const program = new Command()

program
  .name('ops')
  .description('Master-Ops CLI for managing integrations and operations')
  .version('1.0.0')

// =============================================================================
// HEALTH CHECK COMMAND
// =============================================================================

program
  .command('health-check')
  .alias('health')
  .description('Run health checks on all integrations')
  .option('-v, --verbose', 'Show detailed output')
  .option('-s, --services <services>', 'Comma-separated list of services to check (e.g., hubspot,supabase)')
  .action(async (options) => {
    try {
      const services = options.services ? options.services.split(',') : undefined

      const healthCheck = new IntegrationHealthCheck({
        verbose: options.verbose,
        services,
      })

      const summary = await healthCheck.run()
      healthCheck.printResults(summary)

      if (summary.unhealthyServices > 0) {
        process.exit(1)
      }
    } catch (error) {
      console.error('Health check failed:', (error as Error).message)
      process.exit(1)
    }
  })

// =============================================================================
// LOGS COMMAND
// =============================================================================

program
  .command('logs')
  .description('Query integration logs from Supabase')
  .option('-s, --source <source>', 'Filter by source (hubspot, unleashed, n8n, etc.)')
  .option('-l, --level <level>', 'Filter by log level (debug, info, warn, error)')
  .option('--status <status>', 'Filter by status (info, success, warning, error)')
  .option('-n, --limit <number>', 'Number of logs to retrieve', '50')
  .option('--tail', 'Continuously monitor logs (like tail -f)')
  .option('--errors-only', 'Show only errors')
  .action(async (options) => {
    try {
      if (!serviceClient) {
        console.error('Supabase service client not configured')
        process.exit(1)
      }

      const limit = parseInt(options.limit)
      const errorsOnly = options.errorsOnly

      // Build query
      let query = serviceClient
        .from('integration_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (options.source) {
        query = query.eq('source', options.source)
      }

      if (options.level) {
        query = query.eq('level', options.level)
      }

      if (options.status) {
        query = query.eq('status', options.status)
      }

      if (errorsOnly) {
        query = query.eq('level', 'error')
      }

      const { data, error } = await query

      if (error) throw error

      if (!data || data.length === 0) {
        console.log('No logs found matching criteria')
        return
      }

      // Print logs
      console.log(`\nShowing ${data.length} log entries:\n`)
      data.reverse().forEach(log => {
        const timestamp = new Date(log.created_at).toISOString()
        const level = log.level.toUpperCase().padEnd(5)
        const source = log.source.padEnd(12)
        const operation = log.operation ? ` [${log.operation}]` : ''

        let color = '\x1b[0m' // default
        if (log.level === 'error') color = '\x1b[31m' // red
        else if (log.level === 'warn') color = '\x1b[33m' // yellow
        else if (log.level === 'info') color = '\x1b[36m' // cyan

        console.log(`${color}${timestamp} ${level}\x1b[0m ${source}${operation} ${log.message}`)

        if (log.duration_ms) {
          console.log(`  Duration: ${log.duration_ms}ms`)
        }

        if (log.details_json && Object.keys(log.details_json).length > 0) {
          console.log(`  Details: ${JSON.stringify(log.details_json, null, 2)}`)
        }
      })

      if (options.tail) {
        console.log('\nMonitoring for new logs... (Press Ctrl+C to exit)\n')
        // TODO: Implement real-time subscription
        console.log('Note: Real-time tail not yet implemented')
      }
    } catch (error) {
      console.error('Failed to fetch logs:', (error as Error).message)
      process.exit(1)
    }
  })

// =============================================================================
// TEST INTEGRATION COMMAND
// =============================================================================

program
  .command('test-integration <service>')
  .alias('test')
  .description('Test connection to a specific integration')
  .action(async (service) => {
    try {
      console.log(`Testing ${service} integration...\n`)

      const healthCheck = new IntegrationHealthCheck({
        verbose: true,
        services: [service],
      })

      const summary = await healthCheck.run()
      healthCheck.printResults(summary)

      if (summary.unhealthyServices > 0) {
        process.exit(1)
      }
    } catch (error) {
      console.error(`Failed to test ${service}:`, (error as Error).message)
      process.exit(1)
    }
  })

// =============================================================================
// DB QUERY COMMAND
// =============================================================================

program
  .command('db:query <table>')
  .description('Query Supabase table')
  .option('-f, --filter <filter>', 'Filter condition (e.g., status=pending)')
  .option('-l, --limit <number>', 'Limit results', '10')
  .option('-o, --order <field>', 'Order by field', 'created_at')
  .option('--desc', 'Order descending')
  .action(async (table, options) => {
    try {
      if (!serviceClient) {
        console.error('Supabase service client not configured')
        process.exit(1)
      }

      let query = serviceClient
        .from(table)
        .select('*')
        .limit(parseInt(options.limit))

      if (options.filter) {
        const [field, value] = options.filter.split('=')
        query = query.eq(field, value)
      }

      query = query.order(options.order, { ascending: !options.desc })

      const { data, error } = await query

      if (error) throw error

      console.log(`\nQuery results from '${table}':\n`)
      console.log(JSON.stringify(data, null, 2))
      console.log(`\nTotal results: ${data?.length || 0}`)
    } catch (error) {
      console.error('Query failed:', (error as Error).message)
      process.exit(1)
    }
  })

// =============================================================================
// STATS COMMAND
// =============================================================================

program
  .command('stats')
  .description('Show integration statistics and health summary')
  .option('-h, --hours <hours>', 'Hours to look back', '24')
  .action(async (options) => {
    try {
      if (!serviceClient) {
        console.error('Supabase service client not configured')
        process.exit(1)
      }

      const hours = parseInt(options.hours)

      // Query integration health summary view
      const { data, error } = await serviceClient
        .from('integration_health_summary')
        .select('*')

      if (error) throw error

      console.log('\n' + '='.repeat(80))
      console.log(`INTEGRATION STATISTICS (Last ${hours} hours)`)
      console.log('='.repeat(80))

      if (!data || data.length === 0) {
        console.log('No statistics available')
        return
      }

      data.forEach(stat => {
        const errorRate = stat.error_rate_pct || 0
        const color = errorRate > 10 ? '\x1b[31m' : errorRate > 5 ? '\x1b[33m' : '\x1b[32m'

        console.log(`\n${stat.source.toUpperCase()}`)
        console.log(`  Total Logs: ${stat.total_logs}`)
        console.log(`  Errors: ${stat.error_count}`)
        console.log(`  Warnings: ${stat.warning_count}`)
        console.log(`  ${color}Error Rate: ${errorRate}%\x1b[0m`)
        console.log(`  Last Activity: ${new Date(stat.last_activity).toISOString()}`)
      })

      console.log('\n' + '='.repeat(80) + '\n')
    } catch (error) {
      console.error('Failed to fetch statistics:', (error as Error).message)
      process.exit(1)
    }
  })

// =============================================================================
// WORKFLOWS COMMAND
// =============================================================================

program
  .command('workflows')
  .description('List n8n workflow execution statistics')
  .option('-l, --limit <number>', 'Number of workflows to show', '10')
  .option('--failures', 'Show only failed executions')
  .action(async (options) => {
    try {
      if (!serviceClient) {
        console.error('Supabase service client not configured')
        process.exit(1)
      }

      if (options.failures) {
        const { data, error } = await serviceClient
          .from('recent_workflow_failures')
          .select('*')
          .limit(parseInt(options.limit))

        if (error) throw error

        console.log('\n' + '='.repeat(80))
        console.log('RECENT WORKFLOW FAILURES')
        console.log('='.repeat(80))

        if (!data || data.length === 0) {
          console.log('\n✓ No recent failures\n')
          return
        }

        data.forEach(failure => {
          console.log(`\n\x1b[31m✗ ${failure.workflow_name || failure.workflow_id}\x1b[0m`)
          console.log(`  Execution ID: ${failure.execution_id}`)
          console.log(`  Error: ${failure.error_message}`)
          console.log(`  Started: ${new Date(failure.started_at).toISOString()}`)
          if (failure.duration_ms) {
            console.log(`  Duration: ${failure.duration_ms}ms`)
          }
        })

        console.log('\n' + '='.repeat(80) + '\n')
      } else {
        const { data, error } = await serviceClient
          .from('workflow_performance_summary')
          .select('*')
          .limit(parseInt(options.limit))

        if (error) throw error

        console.log('\n' + '='.repeat(80))
        console.log('WORKFLOW PERFORMANCE SUMMARY')
        console.log('='.repeat(80))

        if (!data || data.length === 0) {
          console.log('\nNo workflow data available\n')
          return
        }

        data.forEach(wf => {
          const successRate = wf.success_rate_pct || 0
          const color = successRate > 95 ? '\x1b[32m' : successRate > 80 ? '\x1b[33m' : '\x1b[31m'

          console.log(`\n${wf.workflow_name || wf.workflow_id}`)
          console.log(`  Total Executions: ${wf.total_executions}`)
          console.log(`  Successful: ${wf.successful_executions}`)
          console.log(`  Failed: ${wf.failed_executions}`)
          console.log(`  ${color}Success Rate: ${successRate}%\x1b[0m`)
          console.log(`  Avg Duration: ${wf.avg_duration_ms}ms`)
          console.log(`  P95 Duration: ${wf.p95_duration_ms}ms`)
          console.log(`  Last Execution: ${new Date(wf.last_execution).toISOString()}`)
        })

        console.log('\n' + '='.repeat(80) + '\n')
      }
    } catch (error) {
      console.error('Failed to fetch workflow data:', (error as Error).message)
      process.exit(1)
    }
  })

// Parse CLI arguments
program.parse()
