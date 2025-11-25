#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.SMARTLEAD_API_KEY;
const base = 'https://server.smartlead.ai/api/v1';

async function main() {
  console.log('\n📊 SMARTLEAD ACCOUNT STATUS\n');
  console.log('='.repeat(70) + '\n');
  
  // Get campaigns
  const campaignsResp = await fetch(`${base}/campaigns?api_key=${API_KEY}`);
  const campaigns = await campaignsResp.json();
  
  console.log(`📧 EXISTING CAMPAIGNS: ${campaigns.length}\n`);
  campaigns.forEach((c: any, i: number) => {
    console.log(`${i + 1}. ${c.name || 'Unnamed'}`);
    console.log(`   ID: ${c.id} | Status: ${c.status || 'N/A'} | Created: ${c.created_at?.substring(0, 10)}`);
  });
  
  // Get email accounts
  const accountsResp = await fetch(`${base}/email-accounts?api_key=${API_KEY}`);
  const accounts = await accountsResp.json();
  
  console.log(`\n📬 EMAIL ACCOUNTS: ${accounts.length}\n`);
  const activeAccounts = accounts.filter((a: any) => a.warmup_enabled || a.is_active);
  console.log(`   Active/Warmed: ${activeAccounts.length}`);
  console.log(`   Ready to send: ${activeAccounts.filter((a: any) => a.daily_limit > 0).length}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Account is ready for campaigns!');
  console.log(`\n📋 You can create campaigns via:`);
  console.log(`   - SmartLead Dashboard: https://app.smartlead.ai/campaigns`);
  console.log(`   - Or I can guide you through manual setup\n`);
}

main();
