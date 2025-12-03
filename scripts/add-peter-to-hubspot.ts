#!/usr/bin/env tsx
/**
 * Link peter@teelixir.com to HubSpot
 *
 * Run with: npx tsx scripts/add-peter-to-hubspot.ts
 */

import { hubspotClient } from '../shared/libs/hubspot';

async function main() {
  const email = 'peter@teelixir.com';

  console.log(`🔍 Checking if ${email} exists in HubSpot...\n`);

  try {
    // Check if contact already exists
    const existing = await hubspotClient.getContactByEmail(email);

    if (existing) {
      console.log('✅ Contact already exists in HubSpot:');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Email: ${existing.properties.email}`);
      console.log(`   First Name: ${existing.properties.firstname || '(not set)'}`);
      console.log(`   Last Name: ${existing.properties.lastname || '(not set)'}`);
      console.log(`   Created: ${existing.properties.createdate}`);
      console.log(`\n🔗 View in HubSpot: https://app.hubspot.com/contacts/YOUR_PORTAL_ID/contact/${existing.id}`);
      return;
    }

    // Create new contact
    console.log('📝 Creating new contact...\n');

    const contact = await hubspotClient.createContact({
      email: email,
      firstname: 'Peter',
      lastname: '',  // Add last name if known
      company: 'Teelixir',
      lifecyclestage: 'lead',
    });

    console.log('✅ Contact created successfully!');
    console.log(`   ID: ${contact.id}`);
    console.log(`   Email: ${contact.properties.email}`);
    console.log(`\n🔗 View in HubSpot: https://app.hubspot.com/contacts/YOUR_PORTAL_ID/contact/${contact.id}`);

  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
