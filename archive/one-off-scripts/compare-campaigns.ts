#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.SMARTLEAD_API_KEY;
const base = 'https://server.smartlead.ai/api/v1';

async function main() {
  console.log('\n📊 EXISTING vs PROPOSED CAMPAIGNS\n');
  console.log('='.repeat(70) + '\n');
  
  // Get existing campaigns
  const campaignsResp = await fetch(`${base}/campaigns?api_key=${API_KEY}`);
  const campaigns = await campaignsResp.json();
  
  // Filter beauty-related campaigns
  const beautyCampaigns = campaigns.filter((c: any) => 
    c.name?.toLowerCase().includes('beauty') || 
    c.name?.toLowerCase().includes('massage') ||
    c.name?.toLowerCase().includes('spa') ||
    c.name?.toLowerCase().includes('hair') ||
    c.name?.toLowerCase().includes('cosmetic')
  );
  
  console.log('🔍 EXISTING BEAUTY-RELATED CAMPAIGNS:\n');
  beautyCampaigns.forEach((c: any) => {
    console.log(`${c.status === 'COMPLETED' ? '✅' : c.status === 'ARCHIVED' ? '📦' : '🔵'} ${c.name}`);
    console.log(`   ID: ${c.id} | Status: ${c.status} | Created: ${c.created_at?.substring(0, 10)}`);
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📋 PROPOSED NEW CAMPAIGNS:\n');
  console.log('1. Beauty Blast 2025 - Massage & Spa (1,000 NEW leads)');
  console.log('2. Beauty Blast 2025 - Hair & Beauty (1,000 NEW leads)');
  console.log('3. Beauty Blast 2025 - Cosmetic Pro (200 NEW leads)');
  console.log('\nTotal: 2,200 FRESH leads (99.97% never contacted)');
  
  console.log('\n' + '='.repeat(70));
  console.log('\n💡 RECOMMENDATION:\n');
  console.log('Option A: CREATE NEW CAMPAIGNS ⭐ RECOMMENDED');
  console.log('  Pros:');
  console.log('    ✅ Clean separation from old campaigns');
  console.log('    ✅ New Ambassador messaging (different from wholesale)');
  console.log('    ✅ Easy to track performance of new approach');
  console.log('    ✅ Can compare results vs previous campaigns');
  console.log('\nOption B: ADD TO EXISTING CAMPAIGNS');
  console.log('  Cons:');
  console.log('    ❌ Most existing campaigns are COMPLETED/ARCHIVED');
  console.log('    ❌ Old messaging might be different (wholesale vs Ambassador)');
  console.log('    ❌ Harder to track new vs old performance');
  console.log('    ❌ May confuse reporting');
  
  console.log('\n' + '='.repeat(70));
  console.log('\n🎯 BEST APPROACH:\n');
  console.log('Create 3 NEW campaigns because:');
  console.log('  1. Fresh messaging (Ambassador program focus)');
  console.log('  2. Clean tracking of this specific initiative');
  console.log('  3. Most existing beauty campaigns are already COMPLETED');
  console.log('  4. Easier to measure ROI of new approach');
  console.log('\n' + '='.repeat(70) + '\n');
}

main();
