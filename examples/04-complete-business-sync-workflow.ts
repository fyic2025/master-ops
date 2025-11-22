#!/usr/bin/env tsx
/**
 * Example: Complete Business Sync Workflow
 *
 * A comprehensive example showing a production-ready sync workflow with:
 * - Data fetching from multiple sources
 * - Data transformation and validation
 * - Error handling and retry logic
 * - Logging and monitoring
 * - Alerting on failures
 *
 * This demonstrates best practices for building reliable integration workflows.
 *
 * Usage:
 *   npx tsx examples/04-complete-business-sync-workflow.ts
 *   npx tsx examples/04-complete-business-sync-workflow.ts --business=teelixir --dry-run
 */

import { hubspotClient, unleashedClient, logger } from '../shared/libs/integrations'
import { serviceClient } from '../infra/supabase/client'
import { getAllBusinesses, updateBusinessHubSpotId } from '../shared/libs/utils/business-helpers'
import { transformSupabaseToHubSpot } from '../shared/libs/utils/data-transformers'
import { validateObject, validateEmail } from '../shared/libs/utils/validators'
import { slackAlerter } from '../shared/libs/alerts/slack-alerts'

interface SyncResult {
  business: string
  success: boolean
  action: 'created' | 'updated' | 'skipped'
  hubspotId?: string
  error?: string
}

interface SyncSummary {
  totalProcessed: number
  successful: number
  failed: number
  created: number
  updated: number
  skipped: number
  results: SyncResult[]
  duration: number
}

async function syncBusinessData(options: {
  businessSlug?: string
  dryRun?: boolean
} = {}): Promise<SyncSummary> {
  const startTime = Date.now()
  const results: SyncResult[] = []

  console.log('🔄 Starting Business Sync Workflow\n')
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Business Filter: ${options.businessSlug || 'ALL'}\n`)

  logger.info('Business sync workflow started', {
    source: 'system',
    operation: 'businessSync',
    metadata: { dryRun: options.dryRun, businessSlug: options.businessSlug }
  })

  try {
    // ==========================================================================
    // Step 1: Fetch Businesses from Supabase
    // ==========================================================================

    console.log('Step 1: Fetching businesses from Supabase...')

    const businesses = await getAllBusinesses({ status: 'active' })

    // Filter if specific business requested
    const businessesToSync = options.businessSlug
      ? businesses.filter(b => b.slug === options.businessSlug)
      : businesses

    if (businessesToSync.length === 0) {
      console.log('  ⚠️  No businesses found to sync')
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        results: [],
        duration: Date.now() - startTime
      }
    }

    console.log(`  ✅ Found ${businessesToSync.length} business(es) to sync\n`)

    // ==========================================================================
    // Step 2: Process Each Business
    // ==========================================================================

    console.log('Step 2: Syncing to HubSpot...\n')

    for (const business of businessesToSync) {
      console.log(`📦 Processing: ${business.name}`)

      try {
        // Validate business data
        validateObject(business, ['name', 'slug'])

        // Check if already exists in HubSpot
        if (business.hubspot_company_id) {
          console.log(`  ℹ️  Already synced (HubSpot ID: ${business.hubspot_company_id})`)

          if (!options.dryRun) {
            // Update existing company
            const hubspotData = transformSupabaseToHubSpot(business)

            const updated = await hubspotClient.companies.update(
              business.hubspot_company_id,
              {
                ...hubspotData.properties,
                last_sync_date: new Date().toISOString(),
              }
            )

            console.log(`  ✅ Updated in HubSpot`)

            results.push({
              business: business.name,
              success: true,
              action: 'updated',
              hubspotId: updated.id
            })
          } else {
            console.log(`  🔍 Would update in HubSpot (dry run)`)
            results.push({
              business: business.name,
              success: true,
              action: 'updated',
              hubspotId: business.hubspot_company_id
            })
          }

        } else {
          console.log(`  🆕 Creating new company in HubSpot...`)

          if (!options.dryRun) {
            const hubspotData = transformSupabaseToHubSpot(business)

            const created = await hubspotClient.companies.create({
              ...hubspotData.properties,
              domain: business.metadata?.domain,
              type: business.type || 'business',
              industry: 'E-commerce',
              lifecycle_stage: 'customer',
              created_via: 'master-ops-sync',
            })

            console.log(`  ✅ Created in HubSpot (ID: ${created.id})`)

            // Update Supabase with HubSpot ID
            await updateBusinessHubSpotId(business.id, created.id)
            console.log(`  💾 Updated Supabase with HubSpot ID`)

            results.push({
              business: business.name,
              success: true,
              action: 'created',
              hubspotId: created.id
            })
          } else {
            console.log(`  🔍 Would create in HubSpot (dry run)`)
            results.push({
              business: business.name,
              success: true,
              action: 'created'
            })
          }
        }

        logger.info(`Business synced successfully: ${business.name}`, {
          source: 'hubspot',
          operation: 'syncBusiness',
          businessId: business.id,
          metadata: {
            action: business.hubspot_company_id ? 'updated' : 'created',
            hubspotId: business.hubspot_company_id
          }
        })

      } catch (error) {
        console.error(`  ❌ Failed: ${(error as Error).message}`)

        results.push({
          business: business.name,
          success: false,
          action: 'skipped',
          error: (error as Error).message
        })

        logger.error(`Business sync failed: ${business.name}`, {
          source: 'hubspot',
          operation: 'syncBusiness',
          businessId: business.id
        }, error as Error)

        // Don't throw - continue with other businesses
      }

      console.log()
    }

    // ==========================================================================
    // Step 3: Generate Summary
    // ==========================================================================

    const summary: SyncSummary = {
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length,
      skipped: results.filter(r => r.action === 'skipped').length,
      results,
      duration: Date.now() - startTime
    }

    // ==========================================================================
    // Step 4: Log Summary
    // ==========================================================================

    console.log('=' .repeat(60))
    console.log('SYNC SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Processed: ${summary.totalProcessed}`)
    console.log(`Successful: ${summary.successful} ✅`)
    console.log(`Failed: ${summary.failed} ❌`)
    console.log(`Created: ${summary.created} 🆕`)
    console.log(`Updated: ${summary.updated} 📝`)
    console.log(`Duration: ${(summary.duration / 1000).toFixed(2)}s`)
    console.log('='.repeat(60))

    if (summary.failed > 0) {
      console.log('\n❌ Failed Businesses:')
      summary.results
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.business}: ${r.error}`))
    }

    console.log()

    logger.info('Business sync workflow completed', {
      source: 'system',
      operation: 'businessSync',
      metadata: {
        totalProcessed: summary.totalProcessed,
        successful: summary.successful,
        failed: summary.failed,
        duration: summary.duration
      }
    })

    // ==========================================================================
    // Step 5: Send Alerts (if not dry run)
    // ==========================================================================

    if (!options.dryRun) {
      if (summary.failed > 0) {
        // Send failure alert
        await slackAlerter.sendIntegrationFailure(
          'Business Sync',
          `${summary.failed} businesses failed to sync`,
          summary.failed,
          { operation: 'businessSync' }
        )
      } else if (summary.successful > 0) {
        // Send success notification
        await slackAlerter.sendSuccessNotification(
          'Business Sync Completed',
          `Successfully synced ${summary.successful} businesses to HubSpot`,
          {
            created: summary.created,
            updated: summary.updated,
            duration: summary.duration
          }
        )
      }
    }

    return summary

  } catch (error) {
    const duration = Date.now() - startTime

    logger.error('Business sync workflow failed', {
      source: 'system',
      operation: 'businessSync',
      duration
    }, error as Error)

    if (!options.dryRun) {
      await slackAlerter.sendCriticalAlert(
        'Business Sync Failed',
        `Critical error in business sync workflow: ${(error as Error).message}`,
        { operation: 'businessSync', duration }
      )
    }

    throw error
  }
}

// =============================================================================
// CLI EXECUTION
// =============================================================================

async function main() {
  const args = process.argv.slice(2)
  const businessSlug = args.find(arg => arg.startsWith('--business='))?.split('=')[1]
  const dryRun = args.includes('--dry-run')

  try {
    const summary = await syncBusinessData({ businessSlug, dryRun })

    // Exit with error code if any failures
    if (summary.failed > 0) {
      console.error('\n⚠️  Some businesses failed to sync')
      process.exit(1)
    }

    console.log('✅ Sync completed successfully!\n')
    console.log('💡 Next steps:')
    console.log('   - View logs: ops logs --source=hubspot --operation=syncBusiness')
    console.log('   - Check HubSpot: Visit your HubSpot companies page')
    console.log('   - Verify data: ops db:query businesses\n')

    process.exit(0)

  } catch (error) {
    console.error('\n❌ Sync failed:', (error as Error).message)
    console.error('\n💡 Troubleshooting:')
    console.error('   - Check logs: ops logs --errors-only -n 20')
    console.error('   - Test connection: ops test-integration hubspot')
    console.error('   - Verify credentials: Check .env file\n')

    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { syncBusinessData, SyncResult, SyncSummary }
