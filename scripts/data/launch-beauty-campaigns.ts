#!/usr/bin/env tsx
/**
 * Launch Beauty Market Campaigns via SmartLead API
 * Creates 3 campaigns with email sequences
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const SMARTLEAD_API_KEY = process.env.SMARTLEAD_API_KEY;
const SMARTLEAD_API_URL = 'https://server.smartlead.ai/api/v1';

if (!SMARTLEAD_API_KEY) {
  console.error('❌ Missing SMARTLEAD_API_KEY in .env');
  process.exit(1);
}

console.log('\n🚀 LAUNCHING BEAUTY MARKET CAMPAIGNS\n');
console.log('='.repeat(70) + '\n');

async function testSmartLeadAPI() {
  console.log('📡 Testing SmartLead API connection...\n');
  
  try {
    const response = await fetch(`${SMARTLEAD_API_URL}/campaigns/list?api_key=${SMARTLEAD_API_KEY}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ SmartLead API connected successfully!`);
      console.log(`   Found ${data.length || 0} existing campaigns\n`);
      return true;
    } else {
      console.error('❌ API Error:', data);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

async function createCampaign(name: string, leadFile: string, emailSequence: any[]) {
  console.log(`\n📦 Creating campaign: ${name}...`);
  
  // Step 1: Create the campaign
  const createResponse = await fetch(`${SMARTLEAD_API_URL}/campaigns/create?api_key=${SMARTLEAD_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name,
      client_id: 1,
    })
  });
  
  const campaign = await createResponse.json();
  
  if (!createResponse.ok) {
    console.error(`❌ Failed to create campaign:`, campaign);
    return null;
  }
  
  console.log(`   ✅ Campaign created (ID: ${campaign.id})`);
  
  // Step 2: Upload leads (SmartLead API might require different approach)
  console.log(`   📤 Uploading leads from ${leadFile}...`);
  
  // Note: SmartLead API for bulk upload might need CSV upload via different endpoint
  // This is a placeholder - actual implementation depends on SmartLead API docs
  
  console.log(`   ⚠️  Manual step required: Upload ${leadFile} via SmartLead dashboard`);
  
  return campaign;
}

async function main() {
  // Test API
  const connected = await testSmartLeadAPI();
  if (!connected) {
    console.error('\n❌ Cannot proceed without API connection');
    process.exit(1);
  }
  
  console.log('='.repeat(70));
  console.log('\n📋 CAMPAIGN CREATION PLAN:\n');
  console.log('1. Campaign: Beauty Blast 2025 - Massage & Spa (1,000 leads)');
  console.log('2. Campaign: Beauty Blast 2025 - Hair & Beauty (1,000 leads)');
  console.log('3. Campaign: Beauty Blast 2025 - Cosmetic Pro (200 leads)');
  console.log('\nTotal: 2,200 leads → 8,800 emails (4 per sequence)\n');
  console.log('='.repeat(70));
  
  // Check if CSV files exist
  const files = [
    'massage_spa_leads.csv',
    'hair_beauty_leads.csv',
    'cosmetic_leads.csv'
  ];
  
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`\n❌ Missing file: ${file}`);
      console.error('   Run export-beauty-leads-final.ts first!');
      process.exit(1);
    }
  }
  
  console.log('\n✅ All CSV files found!\n');
  
  // Create campaigns via API
  console.log('Creating campaigns...\n');
  
  const campaign1 = await createCampaign(
    'Beauty Blast 2025 - Massage & Spa',
    'massage_spa_leads.csv',
    [] // Email sequences will be added
  );
  
  const campaign2 = await createCampaign(
    'Beauty Blast 2025 - Hair & Beauty', 
    'hair_beauty_leads.csv',
    []
  );
  
  const campaign3 = await createCampaign(
    'Beauty Blast 2025 - Cosmetic Pro',
    'cosmetic_leads.csv',
    []
  );
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ CAMPAIGN CREATION INITIATED!\n');
  console.log('📋 Next Manual Steps:\n');
  console.log('1. Go to: https://app.smartlead.ai/campaigns');
  console.log('2. For each campaign:');
  console.log('   a) Upload the corresponding CSV file');
  console.log('   b) Configure 4-email sequence from BEAUTY-EMAIL-TEMPLATES-FINAL.md');
  console.log('   c) Set schedule: Mon-Fri, 8am-6pm AEST');
  console.log('   d) Set daily limit: 540 per account');
  console.log('   e) Select 10 email accounts');
  console.log('3. Save as DRAFT');
  console.log('4. Review and ACTIVATE when ready!');
  console.log('\n' + '='.repeat(70) + '\n');
}

main();
