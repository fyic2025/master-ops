#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.log('\n⚠️  Missing credentials in .env file\n');
  console.log('Please add:');
  console.log('  SUPABASE_URL=https://qcvfxxsnqvdfmpbcgdni.supabase.co');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=<your-key>\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeLeadSegments() {
  console.log('\n🔍 Analyzing Beauty Lead Segments...\n');
  console.log('='.repeat(60));

  // Check if table exists and what columns it has
  const { data: tableCheck, error: tableError } = await supabase
    .from('businesses')
    .select('*')
    .limit(1);

  if (tableError) {
    console.log('❌ Error accessing businesses table:', tableError.message);
    console.log('\nTrying teelixir_businesses table instead...\n');
    
    const { data: altCheck } = await supabase
      .from('teelixir_businesses')
      .select('*')
      .limit(1);
    
    if (altCheck && altCheck.length > 0) {
      console.log('📋 Sample columns:', Object.keys(altCheck[0]).join(', '));
    }
    return;
  }

  // Total beauty leads
  const { count: totalBeauty } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%');

  console.log(`\n📊 TOTAL BEAUTY LEADS: ${totalBeauty}\n`);

  // Never contacted (fresh)
  const { count: neverContacted } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .or('total_emails_sent.is.null,total_emails_sent.eq.0');

  console.log(`✅ FRESH (Never contacted): ${neverContacted}`);

  // Previously contacted
  const previouslyContacted = (totalBeauty || 0) - (neverContacted || 0);
  console.log(`📧 PREVIOUSLY CONTACTED: ${previouslyContacted}`);

  // Breakdown by engagement level (if contacted)
  const { count: replied } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .gt('total_emails_sent', 0)
    .eq('has_replied', true);

  const { count: opened } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .gt('total_emails_sent', 0)
    .eq('has_opened', true)
    .neq('has_replied', true);

  const { count: bounced } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .eq('is_bounced', true);

  console.log(`\n📊 ENGAGEMENT BREAKDOWN:`);
  console.log(`   💬 Replied: ${replied || 0}`);
  console.log(`   👁️  Opened (no reply): ${opened || 0}`);
  console.log(`   ❌ Bounced: ${bounced || 0}`);
  console.log(`   😴 Sent (no engagement): ${previouslyContacted - (replied || 0) - (opened || 0)}`);

  // Get sample of previously contacted
  const { data: sampleContacted } = await supabase
    .from('businesses')
    .select('business_name, email, total_emails_sent, last_email_sent_at, has_replied, has_opened')
    .ilike('lead_id', 'beauty%')
    .gt('total_emails_sent', 0)
    .order('last_email_sent_at', { ascending: false })
    .limit(5);

  if (sampleContacted && sampleContacted.length > 0) {
    console.log(`\n📝 SAMPLE PREVIOUSLY CONTACTED LEADS:`);
    sampleContacted.forEach((lead, i) => {
      const lastSent = lead.last_email_sent_at 
        ? new Date(lead.last_email_sent_at).toLocaleDateString() 
        : 'Unknown';
      console.log(`   ${i+1}. ${lead.business_name || 'N/A'}`);
      console.log(`      Sent: ${lead.total_emails_sent} emails | Last: ${lastSent}`);
      console.log(`      ${lead.has_replied ? '💬 Replied' : lead.has_opened ? '👁️  Opened' : '😴 No engagement'}`);
    });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n💡 RECOMMENDATION:\n`);

  const freshPercent = ((neverContacted || 0) / (totalBeauty || 1) * 100).toFixed(1);
  
  if (neverContacted && neverContacted >= 3000) {
    console.log(`✅ You have ${neverContacted} fresh leads (${freshPercent}%)`);
    console.log(`   → OPTION A: Use ONLY fresh leads (safest, clean list)`);
  } else if (neverContacted && neverContacted >= 1500) {
    console.log(`⚠️  You have ${neverContacted} fresh leads (${freshPercent}%)`);
    console.log(`   → OPTION C: Use fresh leads now, re-engage old leads later`);
  } else {
    console.log(`⚠️  Only ${neverContacted} fresh leads (${freshPercent}%)`);
    console.log(`   → OPTION B: Include all leads with prioritization`);
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

analyzeLeadSegments();
