#!/usr/bin/env tsx
/**
 * Example: Sync Business Data to HubSpot
 *
 * Demonstrates a complete workflow for syncing business data to HubSpot:
 * 1. Fetch businesses from Supabase
 * 2. Check if company exists in HubSpot
 * 3. Create or update company in HubSpot
 * 4. Log results
 *
 * Usage:
 *   npx tsx examples/02-sync-business-to-hubspot.ts
 *   npx tsx examples/02-sync-business-to-hubspot.ts --business=teelixir
 */

import { hubspotClient, logger } from '../shared/libs/integrations'
import { serviceClient } from '../infra/supabase/client'

interface Business {
  id: string
  name: string
  slug: string
  hubspot_company_id?: string
  metadata?: any
}

async function syncBusinessToHubSpot(business: Business): Promise<void> {
  logger.info(`Syncing business: ${business.name}`, {
    source: 'hubspot',
    operation: 'syncBusiness',
    businessId: business.id,
  })

  try {
    // Check if company already exists in HubSpot
    if (business.hubspot_company_id) {
      console.log(`  ℹ️  Company exists in HubSpot: ${business.hubspot_company_id}`)

      // Update existing company
      const updated = await hubspotClient.companies.update(
        business.hubspot_company_id,
        {
          name: business.name,
          domain: business.metadata?.domain,
          type: business.metadata?.type || 'business',
          // Add more properties as needed
        }
      )

      console.log(`  ✅ Updated HubSpot company: ${business.name}`)

      logger.info('Business updated in HubSpot', {
        source: 'hubspot',
        operation: 'updateCompany',
        businessId: business.id,
        metadata: {
          hubspotId: updated.id,
          businessName: business.name,
        },
      })

    } else {
      console.log(`  🆕 Creating new company in HubSpot...`)

      // Create new company
      const created = await hubspotClient.companies.create({
        name: business.name,
        domain: business.metadata?.domain,
        type: business.metadata?.type || 'business',
        description: `Business managed via master-ops: ${business.slug}`,
      })

      console.log(`  ✅ Created HubSpot company: ${created.id}`)

      // Update Supabase with HubSpot ID
      if (serviceClient) {
        await serviceClient
          .from('businesses')
          .update({ hubspot_company_id: created.id })
          .eq('id', business.id)

        console.log(`  💾 Updated Supabase with HubSpot ID`)
      }

      logger.info('Business created in HubSpot', {
        source: 'hubspot',
        operation: 'createCompany',
        businessId: business.id,
        metadata: {
          hubspotId: created.id,
          businessName: business.name,
        },
      })
    }

  } catch (error) {
    console.error(`  ❌ Failed to sync ${business.name}:`, (error as Error).message)

    logger.error(`Failed to sync business: ${business.name}`, {
      source: 'hubspot',
      operation: 'syncBusiness',
      businessId: business.id,
    }, error as Error)

    throw error
  }
}

async function main() {
  console.log('🔄 Business to HubSpot Sync\n')

  const args = process.argv.slice(2)
  const businessSlug = args.find(arg => arg.startsWith('--business='))?.split('=')[1]

  try {
    if (!serviceClient) {
      throw new Error('Supabase service client not configured')
    }

    // Fetch businesses from Supabase
    let query = serviceClient
      .from('businesses')
      .select('*')
      .eq('status', 'active')

    if (businessSlug) {
      query = query.eq('slug', businessSlug)
    }

    const { data: businesses, error } = await query

    if (error) throw error

    if (!businesses || businesses.length === 0) {
      console.log('No businesses found to sync')
      return
    }

    console.log(`📋 Found ${businesses.length} business(es) to sync\n`)

    // Sync each business
    for (const business of businesses) {
      console.log(`🔄 Processing: ${business.name}`)
      await syncBusinessToHubSpot(business)
      console.log()
    }

    console.log('✅ Sync completed!\n')
    console.log('💡 View results:')
    console.log('   - ops logs --source=hubspot --operation=syncBusiness')
    console.log('   - ops db:query businesses\n')

  } catch (error) {
    console.error('❌ Sync failed:', (error as Error).message)
    process.exit(1)
  }
}

main()
