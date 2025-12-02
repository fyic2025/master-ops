#!/usr/bin/env tsx
/**
 * List all n8n credentials
 */

import * as dotenv from 'dotenv';

dotenv.config();

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function listCredentials() {
  console.log('🔐 Fetching n8n credentials...\n');

  try {
    // Try different API endpoints
    const endpoints = [
      '/api/v1/credentials',
      '/credentials'
    ];

    for (const endpoint of endpoints) {
      console.log(`Trying: ${N8N_BASE_URL}${endpoint}`);
      const response = await fetch(`${N8N_BASE_URL}${endpoint}`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY || '',
          'Accept': 'application/json'
        }
      });

      console.log(`  Status: ${response.status} ${response.statusText}\n`);

      if (response.ok) {
        const result = await response.json();
        const credentials = result.data || result;

        console.log('✅ Credentials found:\n');
        console.log('─'.repeat(70));

        if (Array.isArray(credentials)) {
          credentials.forEach((cred: any) => {
            console.log(`\nName: ${cred.name}`);
            console.log(`  ID: ${cred.id}`);
            console.log(`  Type: ${cred.type}`);
          });

          console.log('\n' + '─'.repeat(70));

          // Filter relevant ones
          const hubspot = credentials.filter((c: any) =>
            c.type === 'httpHeaderAuth' || c.name.toLowerCase().includes('hubspot')
          );
          const supabase = credentials.filter((c: any) =>
            c.type === 'postgres' || c.name.toLowerCase().includes('supabase')
          );

          if (hubspot.length > 0) {
            console.log('\n📌 HubSpot Credentials:');
            hubspot.forEach((c: any) => console.log(`   ${c.name} (ID: ${c.id}, Type: ${c.type})`));
          }

          if (supabase.length > 0) {
            console.log('\n📌 Supabase Credentials:');
            supabase.forEach((c: any) => console.log(`   ${c.name} (ID: ${c.id}, Type: ${c.type})`));
          }
        }

        return;
      }
    }

    console.log('❌ Could not fetch credentials from any endpoint\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

listCredentials();
