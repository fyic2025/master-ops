#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function analyzeBeautyLeads() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 BEAUTY MARKET CAMPAIGN - LEAD ANALYSIS');
  console.log('='.repeat(70) + '\n');

  // Total beauty leads
  const { count: total } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%');

  console.log(`📊 TOTAL BEAUTY LEADS: ${total}\n`);

  // Leads with valid emails
  const { count: withEmail } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .neq('email', '');

  console.log(`✅ With valid emails: ${withEmail}`);
  console.log(`❌ Missing emails: ${(total || 0) - (withEmail || 0)}\n`);

  // Previously contacted analysis
  console.log('📧 EMAIL HISTORY:\n');
  
  const { count: neverEmailed } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .neq('email', '')
    .or('total_emails_sent.is.null,total_emails_sent.eq.0');

  const { count: emailed } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .gt('total_emails_sent', 0);

  console.log(`   ✨ Never contacted: ${neverEmailed}`);
  console.log(`   📬 Previously emailed: ${emailed}`);

  // Engagement from previous emails
  if (emailed && emailed > 0) {
    const { count: replied } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .ilike('lead_id', 'beauty%')
      .gt('total_emails_sent', 0)
      .eq('is_replied', true);

    const { count: opened } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .ilike('lead_id', 'beauty%')
      .gt('total_emails_sent', 0)
      .eq('is_opened', true);

    console.log(`\n   Of previously emailed:`);
    console.log(`      💬 Replied: ${replied || 0} (${((replied || 0) / emailed * 100).toFixed(1)}%)`);
    console.log(`      👁️  Opened: ${opened || 0} (${((opened || 0) / emailed * 100).toFixed(1)}%)`);
  }

  // Segment breakdown using boolean flags
  console.log(`\n📊 SEGMENT BREAKDOWN (by business type flags):\n`);

  const { count: massage } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .or('is_massage.eq.true,is_spa_and_wellness.eq.true');

  const { count: hair } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .or('is_hair_services.eq.true,is_beauty_salon.eq.true');

  const { count: cosmetic } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .or('is_cosmetic_clinic.eq.true,is_injectables_anti_aging.eq.true,is_laser_skin_treatment.eq.true');

  console.log(`   🧘 Massage & Spa: ${massage}`);
  console.log(`   💇 Hair & Beauty Salons: ${hair}`);
  console.log(`   💉 Cosmetic/Aesthetic: ${cosmetic}`);

  // Sample of leads with emails
  const { data: sampleWithEmail } = await supabase
    .from('businesses')
    .select('name, email, total_emails_sent, is_massage, is_spa_and_wellness, is_hair_services, is_cosmetic_clinic')
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .neq('email', '')
    .limit(5);

  console.log(`\n📝 SAMPLE LEADS WITH EMAILS:\n`);
  sampleWithEmail?.forEach((lead, i) => {
    const type = lead.is_massage ? 'Massage' : 
                 lead.is_spa_and_wellness ? 'Spa' :
                 lead.is_hair_services ? 'Hair' :
                 lead.is_cosmetic_clinic ? 'Cosmetic' : 'Other';
    console.log(`   ${i + 1}. ${lead.name}`);
    console.log(`      📧 ${lead.email}`);
    console.log(`      Type: ${type} | Emails sent: ${lead.total_emails_sent || 0}`);
  });

  console.log(`\n` + '='.repeat(70));
  console.log('💡 CAMPAIGN RECOMMENDATIONS:');
  console.log('='.repeat(70) + '\n');

  const usableLeads = withEmail || 0;
  const target = 3950;

  if (usableLeads >= target) {
    console.log(`✅ You have ${usableLeads} leads with emails`);
    console.log(`✅ Target is 3,950 for 27K email quota`);
    console.log(`✅ READY TO PROCEED with campaign!\n`);
    
    console.log(`📊 Recommended allocation:`);
    console.log(`   Campaign 1 (Massage/Spa): 2,000 leads`);
    console.log(`   Campaign 2 (Hair/Beauty): 1,500 leads`);
    console.log(`   Campaign 3 (Cosmetic): 450 leads`);
    console.log(`   TOTAL: 3,950 leads × 4 emails = 15,800 emails\n`);
  } else {
    console.log(`⚠️  Only ${usableLeads} usable leads`);
    console.log(`⚠️  Target is 3,950 - need ${target - usableLeads} more\n`);
  }

  console.log('='.repeat(70) + '\n');
}

analyzeBeautyLeads();
