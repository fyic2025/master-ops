#!/usr/bin/env tsx
/**
 * Check if beauty leads already exist in HubSpot
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

async function checkHubSpotOverlap() {
  console.log('🔍 Checking if beauty leads exist in HubSpot...\n');

  // Read CSV file
  const csv = fs.readFileSync('beauty_blast_2025_ALL_LEADS.csv', 'utf-8');
  const lines = csv.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  const emailIndex = headers.indexOf('email');

  // Extract first 10 emails to test
  const testEmails = lines.slice(1, 11).map(line => {
    const match = line.match(/"([^"]+@[^"]+)"/);
    return match ? match[1] : null;
  }).filter(Boolean);

  console.log(`📧 Testing ${testEmails.length} sample emails:\n`);

  let existingCount = 0;
  let newCount = 0;

  for (const email of testEmails) {
    try {
      const response = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: 'email',
                operator: 'EQ',
                value: email
              }]
            }],
            properties: ['email', 'firstname', 'lastname', 'outreach_email_count']
          })
        }
      );

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const contact = data.results[0];
        console.log(`  ✅ EXISTS: ${email}`);
        console.log(`     Name: ${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`);
        console.log(`     Emails sent: ${contact.properties.outreach_email_count || 0}`);
        existingCount++;
      } else {
        console.log(`  ➕ NEW: ${email}`);
        newCount++;
      }
    } catch (error: any) {
      console.log(`  ❌ ERROR: ${email} - ${error.message}`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('📊 SAMPLE RESULTS\n');
  console.log(`Existing in HubSpot: ${existingCount}/${testEmails.length}`);
  console.log(`New contacts: ${newCount}/${testEmails.length}`);
  console.log(`\nProjected for all 2,200 leads:`);
  console.log(`  Existing: ~${Math.round((existingCount / testEmails.length) * 2200)}`);
  console.log(`  New: ~${Math.round((newCount / testEmails.length) * 2200)}`);
  console.log('─'.repeat(60));
}

checkHubSpotOverlap();
