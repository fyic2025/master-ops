#!/usr/bin/env tsx
/**
 * Export beauty leads that might not be in SmartLead yet
 * Filters for leads that haven't been emailed much
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function exportFreshLeads() {
  console.log('🔍 Finding fresh beauty leads...\n');

  // Get beauty leads with minimal email history
  const { data: freshLeads, error } = await supabase
    .from('businesses')
    .select('name, email, city, phone, website, total_emails_sent')
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .or('total_emails_sent.is.null,total_emails_sent.lte.2') // Less than 3 emails sent
    .order('total_emails_sent', { ascending: true })
    .limit(3000);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${freshLeads?.length || 0} fresh leads\n`);

  if (!freshLeads || freshLeads.length === 0) {
    console.log('No fresh leads found');
    return;
  }

  // Convert to CSV
  const headers = 'name,email,city,phone,website';
  const rows = freshLeads.map(lead =>
    `"${lead.name}","${lead.email}","${lead.city || '"}","${lead.phone || '"}","${lead.website || '"}"`
  );

  const csv = [headers, ...rows].join('\n');
  fs.writeFileSync('beauty_leads_FRESH.csv', csv);

  console.log('✅ Exported to: beauty_leads_FRESH.csv');
  console.log(`   Total: ${freshLeads.length} leads`);
  console.log('   These leads have 0-2 emails sent previously\n');
}

exportFreshLeads();
