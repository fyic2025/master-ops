#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function exportBeautyLeads() {
  console.log('\n🚀 Exporting Beauty Leads for SmartLead Campaign...\n');
  console.log('='.repeat(70) + '\n');

  // Campaign 1: Massage & Spa (1,850 leads)
  console.log('📦 Campaign 1: Massage & Spa (targeting 1,850 leads)...');
  const { data: massageSpa, error: error1 } = await supabase
    .from('businesses')
    .select('name, email, city, phone, website')
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .neq('email', '')
    .or('is_massage.eq.true,is_spa_and_wellness.eq.true')
    .order('total_emails_sent', { ascending: true })
    .limit(1850);

  if (error1) {
    console.error('❌ Error:', error1.message);
  } else {
    const csv1 = convertToCSV(massageSpa);
    fs.writeFileSync('massage_spa_leads.csv', csv1);
    console.log(`✅ Exported ${massageSpa?.length} leads → massage_spa_leads.csv\n`);
  }

  // Campaign 2: Hair & Beauty (1,900 leads)
  console.log('📦 Campaign 2: Hair & Beauty (targeting 1,900 leads)...');
  const { data: hairBeauty, error: error2 } = await supabase
    .from('businesses')
    .select('name, email, city, phone, website')
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .neq('email', '')
    .or('is_hair_services.eq.true,is_beauty_salon.eq.true')
    .order('total_emails_sent', { ascending: true })
    .limit(1900);

  if (error2) {
    console.error('❌ Error:', error2.message);
  } else {
    const csv2 = convertToCSV(hairBeauty);
    fs.writeFileSync('hair_beauty_leads.csv', csv2);
    console.log(`✅ Exported ${hairBeauty?.length} leads → hair_beauty_leads.csv\n`);
  }

  // Campaign 3: Cosmetic & Aesthetic (200 leads)
  console.log('📦 Campaign 3: Cosmetic & Aesthetic (targeting 200 leads)...');
  const { data: cosmetic, error: error3 } = await supabase
    .from('businesses')
    .select('name, email, city, phone, website')
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .neq('email', '')
    .or('is_cosmetic_clinic.eq.true,is_injectables_anti_aging.eq.true,is_laser_skin_treatment.eq.true')
    .order('total_emails_sent', { ascending: true })
    .limit(200);

  if (error3) {
    console.error('❌ Error:', error3.message);
  } else {
    const csv3 = convertToCSV(cosmetic);
    fs.writeFileSync('cosmetic_leads.csv', csv3);
    console.log(`✅ Exported ${cosmetic?.length} leads → cosmetic_leads.csv\n`);
  }

  console.log('='.repeat(70));
  console.log('✅ EXPORT COMPLETE!\n');
  console.log('📁 Files created in: c:\Users\jayso\master-ops\\n');
  console.log('Next steps:');
  console.log('  1. Open SmartLead: https://app.smartlead.ai/campaigns');
  console.log('  2. Create 3 new campaigns');
  console.log('  3. Upload each CSV file');
  console.log('  4. Configure email sequences from BEAUTY-EMAIL-TEMPLATES-FINAL.md');
  console.log('='.repeat(70) + '\n');
}

function convertToCSV(data: any[] | null): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

exportBeautyLeads();
