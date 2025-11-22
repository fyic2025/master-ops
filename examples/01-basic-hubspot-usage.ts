#!/usr/bin/env tsx
/**
 * Example: Basic HubSpot Usage
 *
 * Demonstrates how to use the new HubSpot connector with automatic:
 * - Rate limiting
 * - Retries on failures
 * - Error handling
 * - Logging to Supabase
 *
 * Usage:
 *   npx tsx examples/01-basic-hubspot-usage.ts
 */

import { hubspotClient, logger } from '../shared/libs/integrations'

async function main() {
  console.log('🚀 HubSpot Connector Examples\n')

  try {
    // ==========================================================================
    // EXAMPLE 1: List Companies
    // ==========================================================================

    console.log('1️⃣  Fetching companies...')
    const companiesResponse = await hubspotClient.companies.list({
      limit: 10,
      properties: ['name', 'domain', 'industry'],
    })

    console.log(`   ✓ Found ${companiesResponse.results.length} companies`)
    companiesResponse.results.forEach(company => {
      console.log(`     - ${company.properties.name} (${company.properties.domain})`)
    })

    // ==========================================================================
    // EXAMPLE 2: List Contacts
    // ==========================================================================

    console.log('\n2️⃣  Fetching contacts...')
    const contactsResponse = await hubspotClient.contacts.list({
      limit: 5,
      properties: ['firstname', 'lastname', 'email'],
    })

    console.log(`   ✓ Found ${contactsResponse.results.length} contacts`)
    contactsResponse.results.forEach(contact => {
      const { firstname, lastname, email } = contact.properties
      console.log(`     - ${firstname} ${lastname} (${email})`)
    })

    // ==========================================================================
    // EXAMPLE 3: Get Contact Properties Schema
    // ==========================================================================

    console.log('\n3️⃣  Fetching contact properties...')
    const properties = await hubspotClient.properties.list('contacts')

    console.log(`   ✓ Found ${properties.length} properties`)
    const customProps = properties.filter(p => !p.name.startsWith('hs_'))
    console.log(`   ✓ ${customProps.length} custom properties`)

    // ==========================================================================
    // EXAMPLE 4: Create Contact (Commented - uncomment to test)
    // ==========================================================================

    console.log('\n4️⃣  Create contact (example - not executing)')
    console.log('     To create a contact, uncomment the following code:')
    console.log(`
    const newContact = await hubspotClient.contacts.create({
      email: 'test@example.com',
      firstname: 'John',
      lastname: 'Doe',
      phone: '+1234567890'
    })
    console.log('Created contact:', newContact.id)
    `)

    // ==========================================================================
    // EXAMPLE 5: Batch Operations
    // ==========================================================================

    console.log('\n5️⃣  Batch operations example')
    console.log('     Fetching multiple companies in parallel...')

    const companyIds = companiesResponse.results.slice(0, 3).map(c => c.id)

    const companies = await Promise.all(
      companyIds.map(id => hubspotClient.companies.get(id))
    )

    console.log(`   ✓ Fetched ${companies.length} companies in parallel`)

    // ==========================================================================
    // EXAMPLE 6: Error Handling
    // ==========================================================================

    console.log('\n6️⃣  Error handling example')
    try {
      await hubspotClient.contacts.get('invalid-id-123')
    } catch (error: any) {
      console.log('   ✓ Caught error as expected:')
      console.log(`     - Error code: ${error.code}`)
      console.log(`     - Error category: ${error.category}`)
      console.log(`     - Retryable: ${error.retryable}`)
    }

    // ==========================================================================
    // EXAMPLE 7: Custom Logging
    // ==========================================================================

    console.log('\n7️⃣  Custom logging example')
    logger.info('Example completed successfully', {
      source: 'hubspot',
      operation: 'examples',
      metadata: {
        companiesFetched: companiesResponse.results.length,
        contactsFetched: contactsResponse.results.length,
      },
    })

    console.log('   ✓ Logged to Supabase integration_logs table')

    console.log('\n✅ All examples completed!\n')
    console.log('💡 Check your Supabase integration_logs table to see logged operations')
    console.log('💡 Run: ops logs --source=hubspot\n')

  } catch (error) {
    console.error('❌ Error running examples:', error)
    logger.error('Example failed', {
      source: 'hubspot',
      operation: 'examples',
    }, error as Error)
    process.exit(1)
  }
}

main()
