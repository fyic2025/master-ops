#!/usr/bin/env tsx
/**
 * Integration Health Check
 *
 * Monitors health of all integrations and persists results to Supabase.
 * Run this script periodically (e.g., via cron or n8n workflow) to track system health.
 *
 * Usage:
 *   npx tsx tools/health-checks/integration-health-check.ts
 *   npx tsx tools/health-checks/integration-health-check.ts --verbose
 *   npx tsx tools/health-checks/integration-health-check.ts --services=hubspot,supabase
 *
 * Environment Variables:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for writing health check results
 *   HUBSPOT_ACCESS_TOKEN - HubSpot access token (optional)
 *   N8N_API_KEY - n8n API key (optional)
 */

import { logger } from '../../shared/libs/logger'
import { serviceClient } from '../../infra/supabase/client'
import { hubspotClient } from '../../shared/libs/integrations/hubspot/client'

interface HealthCheckResult {
  service: string
  healthy: boolean
  timestamp: Date
  responseTime?: number
  error?: string
  details?: Record<string, any>
}

interface HealthCheckSummary {
  totalServices: number
  healthyServices: number
  unhealthyServices: number
  results: HealthCheckResult[]
}

class IntegrationHealthCheck {
  private verbose: boolean = false
  private servicesToCheck: string[] = ['supabase', 'hubspot', 'n8n']

  constructor(options: { verbose?: boolean; services?: string[] } = {}) {
    this.verbose = options.verbose || false
    if (options.services && options.services.length > 0) {
      this.servicesToCheck = options.services
    }
  }

  /**
   * Check Supabase health
   */
  private async checkSupabase(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      if (!serviceClient) {
        throw new Error('Supabase service client not configured')
      }

      // Simple query to verify connection
      const { data, error } = await serviceClient
        .from('tasks')
        .select('id')
        .limit(1)

      if (error) throw error

      const responseTime = Date.now() - startTime

      logger.info('Supabase health check passed', {
        source: 'supabase',
        operation: 'healthCheck',
        duration: responseTime,
      })

      return {
        service: 'supabase',
        healthy: true,
        timestamp: new Date(),
        responseTime,
        details: {
          connected: true,
          querySuccessful: true,
        },
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = (error as Error).message

      logger.error('Supabase health check failed', {
        source: 'supabase',
        operation: 'healthCheck',
        duration: responseTime,
      }, error as Error)

      return {
        service: 'supabase',
        healthy: false,
        timestamp: new Date(),
        responseTime,
        error: errorMessage,
      }
    }
  }

  /**
   * Check HubSpot health
   */
  private async checkHubSpot(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      if (!process.env.HUBSPOT_ACCESS_TOKEN) {
        throw new Error('HubSpot access token not configured')
      }

      await hubspotClient.healthCheck()

      const responseTime = Date.now() - startTime

      logger.info('HubSpot health check passed', {
        source: 'hubspot',
        operation: 'healthCheck',
        duration: responseTime,
      })

      return {
        service: 'hubspot',
        healthy: true,
        timestamp: new Date(),
        responseTime,
        details: {
          apiAccessible: true,
        },
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = (error as Error).message

      logger.error('HubSpot health check failed', {
        source: 'hubspot',
        operation: 'healthCheck',
        duration: responseTime,
      }, error as Error)

      return {
        service: 'hubspot',
        healthy: false,
        timestamp: new Date(),
        responseTime,
        error: errorMessage,
      }
    }
  }

  /**
   * Check n8n health
   */
  private async checkN8n(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      const baseUrl = process.env.N8N_BASE_URL
      const apiKey = process.env.N8N_API_KEY

      if (!baseUrl || !apiKey) {
        throw new Error('n8n configuration not found')
      }

      // Try to fetch workflows list
      const response = await fetch(`${baseUrl}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': apiKey,
        },
      })

      if (!response.ok) {
        throw new Error(`n8n API returned ${response.status}`)
      }

      const responseTime = Date.now() - startTime

      logger.info('n8n health check passed', {
        source: 'n8n',
        operation: 'healthCheck',
        duration: responseTime,
      })

      return {
        service: 'n8n',
        healthy: true,
        timestamp: new Date(),
        responseTime,
        details: {
          apiAccessible: true,
        },
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = (error as Error).message

      logger.error('n8n health check failed', {
        source: 'n8n',
        operation: 'healthCheck',
        duration: responseTime,
      }, error as Error)

      return {
        service: 'n8n',
        healthy: false,
        timestamp: new Date(),
        responseTime,
        error: errorMessage,
      }
    }
  }

  /**
   * Persist health check results to Supabase
   */
  private async persistResults(results: HealthCheckResult[]): Promise<void> {
    if (!serviceClient) {
      logger.warn('Cannot persist health check results - Supabase service client not available', {
        source: 'system',
        operation: 'persistHealthCheck',
      })
      return
    }

    try {
      for (const result of results) {
        await serviceClient.from('integration_logs').insert({
          source: result.service as any,
          service: result.service,
          operation: 'health_check',
          level: result.healthy ? 'info' : 'error',
          status: result.healthy ? 'success' : 'error',
          message: result.healthy
            ? `Health check passed in ${result.responseTime}ms`
            : `Health check failed: ${result.error}`,
          details_json: result.details || { error: result.error },
          duration_ms: result.responseTime,
        })
      }

      logger.debug('Health check results persisted to Supabase', {
        source: 'system',
        operation: 'persistHealthCheck',
        metadata: {
          resultsCount: results.length,
        },
      })
    } catch (error) {
      logger.error('Failed to persist health check results', {
        source: 'system',
        operation: 'persistHealthCheck',
      }, error as Error)
    }
  }

  /**
   * Run all health checks
   */
  async run(): Promise<HealthCheckSummary> {
    logger.info('Starting integration health checks', {
      source: 'system',
      operation: 'healthCheck',
      metadata: {
        services: this.servicesToCheck,
      },
    })

    const results: HealthCheckResult[] = []

    // Run health checks in parallel
    const checks: Promise<HealthCheckResult>[] = []

    if (this.servicesToCheck.includes('supabase')) {
      checks.push(this.checkSupabase())
    }

    if (this.servicesToCheck.includes('hubspot')) {
      checks.push(this.checkHubSpot())
    }

    if (this.servicesToCheck.includes('n8n')) {
      checks.push(this.checkN8n())
    }

    const checkResults = await Promise.allSettled(checks)

    checkResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        // If health check itself failed
        const serviceName = this.servicesToCheck[index]
        results.push({
          service: serviceName,
          healthy: false,
          timestamp: new Date(),
          error: result.reason?.message || 'Health check failed',
        })
      }
    })

    // Persist results
    await this.persistResults(results)

    // Generate summary
    const summary: HealthCheckSummary = {
      totalServices: results.length,
      healthyServices: results.filter(r => r.healthy).length,
      unhealthyServices: results.filter(r => !r.healthy).length,
      results,
    }

    logger.info('Health check completed', {
      source: 'system',
      operation: 'healthCheck',
      metadata: {
        total: summary.totalServices,
        healthy: summary.healthyServices,
        unhealthy: summary.unhealthyServices,
      },
    })

    return summary
  }

  /**
   * Print results to console
   */
  printResults(summary: HealthCheckSummary): void {
    console.log('\n' + '='.repeat(80))
    console.log('INTEGRATION HEALTH CHECK RESULTS')
    console.log('='.repeat(80))
    console.log(`Timestamp: ${new Date().toISOString()}`)
    console.log(`Total Services: ${summary.totalServices}`)
    console.log(`Healthy: ${summary.healthyServices} ✓`)
    console.log(`Unhealthy: ${summary.unhealthyServices} ✗`)
    console.log('='.repeat(80))

    summary.results.forEach(result => {
      const status = result.healthy ? '✓ HEALTHY' : '✗ UNHEALTHY'
      const color = result.healthy ? '\x1b[32m' : '\x1b[31m' // green or red
      const reset = '\x1b[0m'

      console.log(`\n${color}${status}${reset} ${result.service.toUpperCase()}`)
      if (result.responseTime) {
        console.log(`  Response Time: ${result.responseTime}ms`)
      }
      if (result.error) {
        console.log(`  Error: ${result.error}`)
      }
      if (this.verbose && result.details) {
        console.log(`  Details: ${JSON.stringify(result.details, null, 2)}`)
      }
    })

    console.log('\n' + '='.repeat(80) + '\n')
  }
}

// =============================================================================
// CLI EXECUTION
// =============================================================================

async function main() {
  const args = process.argv.slice(2)
  const verbose = args.includes('--verbose') || args.includes('-v')

  // Parse services argument
  const servicesArg = args.find(arg => arg.startsWith('--services='))
  const services = servicesArg
    ? servicesArg.split('=')[1].split(',')
    : undefined

  const healthCheck = new IntegrationHealthCheck({ verbose, services })

  try {
    const summary = await healthCheck.run()
    healthCheck.printResults(summary)

    // Exit with error code if any services are unhealthy
    if (summary.unhealthyServices > 0) {
      process.exit(1)
    }

    process.exit(0)
  } catch (error) {
    logger.error('Health check failed with error', {
      source: 'system',
      operation: 'healthCheck',
    }, error as Error)

    console.error('Health check failed:', (error as Error).message)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { IntegrationHealthCheck, HealthCheckResult, HealthCheckSummary }
