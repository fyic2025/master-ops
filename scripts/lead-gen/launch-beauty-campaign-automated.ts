#!/usr/bin/env tsx

/**
 * Beauty Leads Campaign Automation Script
 *
 * This script automates the entire campaign setup:
 * 1. Exports fresh beauty leads from Supabase (excluding fitness)
 * 2. Creates a new Smartlead campaign
 * 3. Uploads 4-email sequence via API
 * 4. Batch uploads all leads
 * 5. Assigns email accounts
 * 6. Configures schedule
 * 7. Activates the campaign
 *
 * Usage:
 *   npx tsx scripts/launch-beauty-campaign-automated.ts
 *   npx tsx scripts/launch-beauty-campaign-automated.ts --dry-run
 *   npx tsx scripts/launch-beauty-campaign-automated.ts --segment massage_spa
 */

import { createClient } from '@supabase/supabase-js'
import { smartleadClient } from '../shared/libs/integrations/smartlead'
import type { CampaignSequence, SmartleadLead } from '../shared/libs/integrations/smartlead/types'

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8',

  campaign: {
    name: 'Beauty Ambassador Q4 2025',
    utm_campaign: 'beauty_ambassador_q4_2025',
    landing_url: 'https://teelixir.com.au/pages/teelixir-wholesale-support/',
  },

  schedule: {
    timezone: 'Australia/Sydney',
    days_of_the_week: [1, 2, 3, 4, 5], // Mon-Fri
    start_hour: 9,
    end_hour: 17,
    min_time_btw_emails: 3, // minutes
    max_new_leads_per_day: 500,
  },

  settings: {
    track_settings: {
      open: false, // Disable open tracking for deliverability
      click: true,
    },
    stop_lead_settings: {
      stop_on_reply: true,
      stop_on_auto_reply: false,
      stop_on_link_click: false,
    },
    send_as_plain_text: false, // HTML emails
  },

  batch_size: 100, // Smartlead API limit
  db_batch_size: 1000,
}

// =============================================================================
// Email Templates
// =============================================================================

function getEmailTemplates(utmCampaign: string, landingUrl: string) {
  const url = `${landingUrl}?utm_source=smartlead&utm_medium=email&utm_campaign=${utmCampaign}`

  return [
    {
      seq_number: 1,
      delay_days: 0,
      subject: 'Partnership opportunity - {{company_name}}',
      body: `<p>Hello,</p>

<p>I'm reaching out to {{company_name}} about a passive revenue opportunity for beauty and wellness businesses.</p>

<p><strong>The program:</strong><br>
Partner with Teelixir to offer premium superfood supplements to your clients. You earn 10-25% commission on sales.</p>

<p><strong>Why beauty businesses join:</strong></p>
<ul>
<li>No inventory or upfront costs</li>
<li>Products ship directly to customers</li>
<li>Average partner earns $150-500/month passive</li>
<li>Takes 5 minutes to set up</li>
</ul>

<p><strong>How it works:</strong><br>
Share a custom link with clients → They purchase → You earn commission automatically.</p>

<p>Application: <a href="${url}">${landingUrl}</a></p>

<p>Worth reviewing?</p>

<p>Regards,<br>
Teelixir Partnership Team</p>`
    },
    {
      seq_number: 2,
      delay_days: 3,
      subject: 'Re: Partnership - {{company_name}}',
      body: `<p>Following up on the partnership opportunity for {{company_name}}.</p>

<p><strong>Quick numbers:</strong></p>
<ul>
<li>10% commission (start)</li>
<li>20% at $500/month in sales</li>
<li>25% at $1,500/month in sales</li>
</ul>

<p>No quotas, no commitments. Just a passive revenue stream for businesses like yours.</p>

<p><strong>Common question:</strong> "What products?"<br>
Premium adaptogens, medicinal mushrooms, superfood blends - wellness products your clients already buy.</p>

<p>Review the program: <a href="${url}">${landingUrl}</a></p>

<p>Questions?</p>

<p>Teelixir Partnerships</p>`
    },
    {
      seq_number: 3,
      delay_days: 2,
      subject: '{{company_name}} - wellness product revenue',
      body: `<p>Quick check-in about the Ambassador program for {{company_name}}.</p>

<p><strong>What makes this different:</strong></p>
<ul>
<li>Zero investment required</li>
<li>No inventory management</li>
<li>Products ship directly from us</li>
<li>You focus on your business, earn passive commissions</li>
</ul>

<p>Most beauty/wellness businesses who join say they wish they'd started sooner.</p>

<p>Full details: <a href="${url}">${landingUrl}</a></p>

<p>Worth 5 minutes?</p>

<p>Teelixir Team</p>`
    },
    {
      seq_number: 4,
      delay_days: 2,
      subject: 'Final follow-up - {{company_name}}',
      body: `<p>Last email about the Teelixir partnership.</p>

<p><strong>Summary:</strong></p>
<ul>
<li>10-25% commission on wellness products</li>
<li>$0 to start, no ongoing costs</li>
<li>Avg partner: $250/month passive income</li>
<li>Set up in 5 minutes</li>
</ul>

<p>If this interests {{company_name}}, apply here: <a href="${url}">${landingUrl}</a></p>

<p>If not, no worries - I'll close your file.</p>

<p>Best regards,<br>
Teelixir Partnerships</p>`
    }
  ]
}

// =============================================================================
// Database Functions
// =============================================================================

interface BeautyLead {
  email: string
  business_name: string | null
  name: string | null
  city: string | null
  phone: string | null
  website: string | null
  primary_category: string | null
  total_emails_sent: number | null
}

async function fetchFreshBeautyLeads(supabase: any): Promise<BeautyLead[]> {
  console.log('\n📊 Fetching fresh beauty leads from Supabase...')

  let allLeads: BeautyLead[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('businesses')
      .select('email, business_name, name, city, phone, website, primary_category, total_emails_sent')
      .like('lead_id', 'beauty%')
      .not('email', 'is', null)
      .neq('email', '')
      .like('email', '%@%')
      .or('business_name.not.is.null,name.not.is.null')
      // Exclude fitness leads explicitly
      .not('primary_category', 'ilike', '%fitness%')
      .not('primary_category', 'ilike', '%gym%')
      .not('primary_category', 'ilike', '%personal trainer%')
      // Filter for beauty categories
      .or([
        'primary_category.ilike.%massage%',
        'primary_category.ilike.%spa%',
        'primary_category.ilike.%wellness%',
        'primary_category.ilike.%hair%',
        'primary_category.ilike.%salon%',
        'primary_category.ilike.%beauty%',
        'primary_category.ilike.%cosmetic%',
        'primary_category.ilike.%skin%',
        'primary_category.ilike.%laser%',
        'primary_category.ilike.%aesthetic%',
        'primary_category.ilike.%nail%',
        'primary_category.ilike.%barber%',
        'primary_category.ilike.%therapist%'
      ].join(','))
      .range(offset, offset + CONFIG.db_batch_size - 1)
      .order('total_emails_sent', { ascending: true, nullsFirst: true })

    if (error) {
      console.error(`   ❌ Error at offset ${offset}:`, error.message)
      break
    }

    if (!data || data.length === 0) {
      hasMore = false
      break
    }

    allLeads.push(...data)
    offset += CONFIG.db_batch_size
    process.stdout.write(`\r   Fetched ${allLeads.length} leads...`)

    if (data.length < CONFIG.db_batch_size) {
      hasMore = false
    }
  }

  // Dedupe by email
  const seen = new Set<string>()
  const uniqueLeads = allLeads.filter(lead => {
    const email = lead.email.toLowerCase()
    if (seen.has(email)) return false
    seen.add(email)
    return true
  })

  console.log(`\n   ✅ Total unique leads: ${uniqueLeads.length}`)
  return uniqueLeads
}

// =============================================================================
// Smartlead Functions
// =============================================================================

async function createCampaign(name: string): Promise<string> {
  console.log(`\n📧 Creating campaign: "${name}"`)

  const campaign = await smartleadClient.campaigns.create({ name })
  console.log(`   ✅ Campaign created: ID ${campaign.id}`)
  return campaign.id
}

async function uploadSequences(campaignId: string): Promise<void> {
  console.log('\n📝 Uploading email sequences...')

  const templates = getEmailTemplates(CONFIG.campaign.utm_campaign, CONFIG.campaign.landing_url)

  const sequences: CampaignSequence[] = templates.map(t => ({
    seq_number: t.seq_number,
    seq_delay_details: {
      delay_in_days: t.delay_days,
    },
    seq_variants: [{
      subject: t.subject,
      email_body: t.body,
      variant_label: 'A',
    }]
  }))

  await smartleadClient.campaigns.saveSequence(campaignId, { sequences })
  console.log(`   ✅ Uploaded ${templates.length} email sequences`)
}

async function uploadLeads(campaignId: string, leads: BeautyLead[]): Promise<number> {
  console.log(`\n👥 Uploading ${leads.length} leads in batches of ${CONFIG.batch_size}...`)

  let totalUploaded = 0
  let totalDuplicates = 0
  let totalInvalid = 0

  for (let i = 0; i < leads.length; i += CONFIG.batch_size) {
    const batch = leads.slice(i, i + CONFIG.batch_size)

    const leadList: SmartleadLead[] = batch.map(lead => ({
      email: lead.email,
      first_name: '',
      last_name: '',
      company_name: lead.business_name || lead.name || '',
      custom_fields: {
        city: lead.city || '',
        phone: lead.phone || '',
        website: lead.website || '',
        category: lead.primary_category || '',
      }
    }))

    try {
      const result = await smartleadClient.leads.add(campaignId, {
        lead_list: leadList,
        ignore_duplicate_leads_in_other_campaign: false,
      })

      totalUploaded += result.upload_count
      totalDuplicates += result.duplicates || 0
      totalInvalid += result.invalid_emails || 0

      process.stdout.write(`\r   Progress: ${Math.min(i + CONFIG.batch_size, leads.length)}/${leads.length} (${totalUploaded} uploaded)`)

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 250))
    } catch (error: any) {
      console.error(`\n   ⚠️ Batch ${Math.floor(i / CONFIG.batch_size) + 1} error: ${error.message}`)
    }
  }

  console.log(`\n   ✅ Upload complete:`)
  console.log(`      - Uploaded: ${totalUploaded}`)
  console.log(`      - Duplicates: ${totalDuplicates}`)
  console.log(`      - Invalid: ${totalInvalid}`)

  return totalUploaded
}

async function assignEmailAccounts(campaignId: string): Promise<void> {
  console.log('\n📬 Assigning email accounts to campaign...')

  const accounts = await smartleadClient.emailAccounts.list()

  if (accounts.results.length === 0) {
    console.log('   ⚠️ No email accounts found. You\'ll need to add them manually.')
    return
  }

  // Filter for active/warmed accounts
  const activeAccounts = accounts.results.filter((a: any) =>
    a.warmup_enabled !== false && a.is_connected !== false
  )

  if (activeAccounts.length === 0) {
    console.log('   ⚠️ No active email accounts found. Using all accounts.')
    const accountIds = accounts.results.map((a: any) => a.id)
    await smartleadClient.emailAccounts.addToCampaign(campaignId, accountIds)
    console.log(`   ✅ Added ${accountIds.length} email accounts`)
  } else {
    const accountIds = activeAccounts.map((a: any) => a.id)
    await smartleadClient.emailAccounts.addToCampaign(campaignId, accountIds)
    console.log(`   ✅ Added ${accountIds.length} active email accounts`)
  }
}

async function configureSchedule(campaignId: string): Promise<void> {
  console.log('\n⏰ Configuring campaign schedule...')

  await smartleadClient.campaigns.updateSchedule(campaignId, CONFIG.schedule)
  console.log(`   ✅ Schedule set: ${CONFIG.schedule.days_of_the_week.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`)
  console.log(`      Hours: ${CONFIG.schedule.start_hour}:00 - ${CONFIG.schedule.end_hour}:00 ${CONFIG.schedule.timezone}`)
  console.log(`      Daily limit: ${CONFIG.schedule.max_new_leads_per_day} new leads/day`)
}

async function configureSettings(campaignId: string): Promise<void> {
  console.log('\n⚙️ Configuring campaign settings...')

  await smartleadClient.campaigns.updateSettings(campaignId, CONFIG.settings)
  console.log(`   ✅ Settings configured:`)
  console.log(`      - Open tracking: ${CONFIG.settings.track_settings.open ? 'ON' : 'OFF'}`)
  console.log(`      - Click tracking: ${CONFIG.settings.track_settings.click ? 'ON' : 'OFF'}`)
  console.log(`      - Stop on reply: ${CONFIG.settings.stop_lead_settings.stop_on_reply ? 'YES' : 'NO'}`)
}

// =============================================================================
// Main Execution
// =============================================================================

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const activateNow = args.includes('--activate')

  console.log('═'.repeat(60))
  console.log('🚀 BEAUTY LEADS CAMPAIGN AUTOMATION')
  console.log('═'.repeat(60))
  console.log(`\nCampaign: ${CONFIG.campaign.name}`)
  console.log(`Landing URL: ${CONFIG.campaign.landing_url}`)
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`)

  if (isDryRun) {
    console.log('\n⚠️ DRY RUN MODE - No changes will be made\n')
  }

  try {
    // 1. Connect to Supabase
    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey)

    // 2. Fetch leads
    const leads = await fetchFreshBeautyLeads(supabase)

    if (leads.length === 0) {
      console.log('\n❌ No leads found. Exiting.')
      return
    }

    // Show lead breakdown
    console.log('\n📊 Lead breakdown:')
    const categories: Record<string, number> = {}
    leads.forEach(l => {
      const cat = l.primary_category?.toLowerCase() || 'unknown'
      if (cat.includes('massage') || cat.includes('spa')) categories['Massage/Spa'] = (categories['Massage/Spa'] || 0) + 1
      else if (cat.includes('hair') || cat.includes('salon') || cat.includes('barber')) categories['Hair/Salon'] = (categories['Hair/Salon'] || 0) + 1
      else if (cat.includes('cosmetic') || cat.includes('skin') || cat.includes('laser')) categories['Cosmetic/Skin'] = (categories['Cosmetic/Skin'] || 0) + 1
      else if (cat.includes('beauty')) categories['Beauty'] = (categories['Beauty'] || 0) + 1
      else if (cat.includes('nail')) categories['Nail'] = (categories['Nail'] || 0) + 1
      else categories['Other'] = (categories['Other'] || 0) + 1
    })
    Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`)
    })

    if (isDryRun) {
      console.log('\n✅ DRY RUN complete. Would have:')
      console.log(`   - Created campaign: "${CONFIG.campaign.name}"`)
      console.log(`   - Uploaded 4 email sequences`)
      console.log(`   - Added ${leads.length} leads`)
      console.log(`   - Configured schedule and settings`)
      console.log('\nRun without --dry-run to execute.')
      return
    }

    // 3. Test Smartlead connection
    console.log('\n🔗 Testing Smartlead API connection...')
    const health = await smartleadClient.healthCheck()
    if (!health.healthy) {
      console.error('❌ Smartlead API not available')
      return
    }
    console.log('   ✅ Smartlead API connected')

    // 4. Create campaign
    const campaignId = await createCampaign(CONFIG.campaign.name)

    // 5. Upload sequences
    await uploadSequences(campaignId)

    // 6. Upload leads
    const uploadedCount = await uploadLeads(campaignId, leads)

    // 7. Assign email accounts
    await assignEmailAccounts(campaignId)

    // 8. Configure schedule
    await configureSchedule(campaignId)

    // 9. Configure settings
    await configureSettings(campaignId)

    // Summary
    console.log('\n' + '═'.repeat(60))
    console.log('✅ CAMPAIGN SETUP COMPLETE!')
    console.log('═'.repeat(60))
    console.log(`
Campaign ID:    ${campaignId}
Campaign Name:  ${CONFIG.campaign.name}
Leads Uploaded: ${uploadedCount}
Email Sequence: 4 emails over 7 days
Schedule:       Mon-Fri 9am-5pm AEST
Daily Limit:    ${CONFIG.schedule.max_new_leads_per_day} new leads/day

Dashboard: https://app.smartlead.ai/campaigns/${campaignId}
`)

    if (activateNow) {
      console.log('🚀 Activating campaign...')
      // Note: Smartlead doesn't have a direct "activate" API endpoint
      // Campaign needs to be activated from the dashboard
      console.log('   ⚠️ Please activate the campaign from the Smartlead dashboard')
    } else {
      console.log('📋 Next steps:')
      console.log('   1. Review campaign in Smartlead dashboard')
      console.log('   2. Verify email accounts are connected')
      console.log('   3. Check email sequences look correct')
      console.log('   4. Activate campaign when ready')
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

main()
