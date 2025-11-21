/**
 * Quick test script to verify HubSpot integration
 *
 * Run with: npx tsx test-hubspot.ts
 */

import { hubspotClient, hubspotAPI } from './shared/libs/hubspot';

async function testHubSpotIntegration() {
  console.log('🧪 Testing HubSpot Integration...\n');

  try {
    // Test 1: Get account info via API
    console.log('1️⃣ Testing API: Getting account info...');
    const accountInfo = await hubspotAPI.getAccountInfo();
    console.log('✅ Account Info:', {
      portalId: accountInfo.portalId,
      timeZone: accountInfo.timeZone,
      currency: accountInfo.currency
    });
    console.log();

    // Test 2: Get contacts via SDK
    console.log('2️⃣ Testing SDK: Getting contacts...');
    const contacts = await hubspotClient.getContacts(5);
    console.log(`✅ Found ${contacts.length} contacts`);
    if (contacts.length > 0) {
      console.log('First contact:', {
        id: contacts[0].id,
        email: contacts[0].properties.email,
        name: `${contacts[0].properties.firstname || ''} ${contacts[0].properties.lastname || ''}`
      });
    }
    console.log();

    // Test 3: Get companies via API
    console.log('3️⃣ Testing API: Getting companies...');
    const companies = await hubspotAPI.getCompanies(5);
    console.log(`✅ Found ${companies.results?.length || 0} companies`);
    console.log();

    // Test 4: Get deals via SDK
    console.log('4️⃣ Testing SDK: Getting deals...');
    const deals = await hubspotClient.getDeals(5);
    console.log(`✅ Found ${deals.length} deals`);
    console.log();

    console.log('🎉 All tests passed! HubSpot integration is working correctly.\n');

    return {
      success: true,
      accountInfo,
      contactsCount: contacts.length,
      companiesCount: companies.results?.length || 0,
      dealsCount: deals.length
    };

  } catch (error) {
    console.error('❌ Error testing HubSpot integration:', error);
    console.error('\nPlease check:');
    console.error('1. Your .env file has the correct HUBSPOT_ACCESS_TOKEN');
    console.error('2. The access token has the necessary permissions');
    console.error('3. Your HubSpot account is accessible\n');

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Run the test
testHubSpotIntegration()
  .then(result => {
    if (result.success) {
      console.log('Integration Summary:');
      console.log(`- Portal ID: ${result.accountInfo?.portalId}`);
      console.log(`- Contacts: ${result.contactsCount}`);
      console.log(`- Companies: ${result.companiesCount}`);
      console.log(`- Deals: ${result.dealsCount}`);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
