#!/usr/bin/env tsx

import { smartleadClient } from '../shared/libs/integrations/smartlead'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'

const SMARTLEAD_API_KEY = '635bf7d6-8778-49c3-adb0-7fd6ad6ac59f_ugf6jzk'

// Email templates for each campaign
const emailTemplates = {
  massage_spa: {
    campaign_name: 'Beauty Blast 2025 - Massage & Spa',
    utm_campaign: 'beauty_blast_massage_spa',
    emails: [
      {
        subject: 'Earn from your existing massage/spa clients',
        body: `Hi there,

Quick question for {{company_name}}:

Would you be interested in earning 10-25% commission just by having a poster in your space?

No inventory, no investment, no selling required.

Here's how it works:
→ We give you a custom QR code poster
→ Your clients scan it and order online
→ You earn commission on every order
→ We ship directly to them

Teelixir makes premium organic mushroom supplements (think: beauty from within, stress relief, better sleep). Perfect fit for wellness-conscious spa & massage clients.

300+ Australian businesses already earning passive income this way.

Interested? Takes 2 minutes to apply:
https://teelixir.com.au/pages/teelixir-wholesale-support?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_massage_spa

(Or if you'd rather stock products for 40% margins, that's an option too)

Jayson
Teelixir Ambassador Program`,
        delay_in_days: 0
      },
      {
        subject: 'RE: Passive income for massage & spa',
        body: `Hi,

Following up on the Teelixir Ambassador opportunity.

Since you're in the massage/spa space, here's what similar businesses are earning:

**Small spa/massage (20-30 clients/week):**
• 3-5 orders per month
• Average order: $85-120
• Commission: $150-250/month
• No work required

**Medium spa (50+ clients/week):**
• 8-12 orders per month
• Commission: $350-500/month
• Just from having a poster up

**How commissions work:**
→ Month 1-3: 10% on all orders
→ Month 4-6: 20% on all orders
→ Month 7+: 25% on all orders

**What you get:**
✓ Custom QR code poster (we design it)
✓ Monthly sample sachets (try before you recommend)
✓ Professional training materials
✓ Featured on our website as a partner
✓ Zero inventory or upfront cost

**Top sellers in wellness spaces:**
• Tremella (beauty mushroom)
• Reishi (stress & sleep)
• Pearl Beauty Tonic (skin radiance)

Apply: https://teelixir.com.au/pages/teelixir-wholesale-support?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_massage_spa

Worst case? You make $0. Best case? $300-500/month passive.

Worth 2 minutes?

Jayson
Teelixir Ambassador Program`,
        delay_in_days: 2
      },
      {
        subject: 'Why you haven\'t replied (probably)',
        body: `Hi,

I've reached out twice about the Teelixir Ambassador program.

You haven't replied, so let me guess what you're thinking:

**"Sounds too good to be true"**
→ Fair. But we have 300+ partners earning commission this way. It's how modern DTC brands grow.

**"My clients won't scan a QR code"**
→ QR adoption is 85%+ now (thanks, COVID menus). Our data shows 8-15% of people who see the poster scan it.

**"I don't want to be pushy or salesy"**
→ You literally don't mention it. Poster does the work. You're just offering an option.

**"What's the catch?"**
→ No catch. We need distribution, you have clients. We pay you for access.

**"Takes too much time to set up"**
→ 2-minute application. We design the poster. You put it up. Done.

**"What if nobody orders?"**
→ Then you made $0 and lost 2 minutes. But realistically, if you have 20+ clients/week, you'll get orders.

**"I'd rather stock products and make more"**
→ That's an option too (40% margins). But Ambassador has zero risk.

Still on the fence?

Just reply "send me info" and I'll share:
• Example earnings by business type
• Sample poster designs
• How commission tiers work
• Full partner testimonials

Or apply directly: https://teelixir.com.au/pages/teelixir-wholesale-support?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_massage_spa

Your call.

Jayson

P.S. - Honest question: What would you need to see/know to feel comfortable trying this?`,
        delay_in_days: 2
      },
      {
        subject: 'Closing your file',
        body: `Hi,

This is my last email about the Teelixir Ambassador program.

I've reached out a few times, haven't heard back.

I'm going to assume it's not a fit for {{company_name}} right now.

Before I close your file, here's the TL;DR:
• Earn 10-25% commission from your existing clients
• We give you a QR code poster (free)
• No inventory, investment, or selling required
• Takes 2 minutes to apply
• Zero risk (if nobody orders, you lost nothing)

If you want to try it: https://teelixir.com.au/pages/teelixir-wholesale-support?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_massage_spa

If not, no worries at all. I'll leave you alone.

Either way, all the best with {{company_name}}.

Jayson

---

P.S. - Quick reality check: In the 5 minutes it took you to read my 4 emails, you could've applied and had a poster up already earning commission. Just saying. 😊`,
        delay_in_days: 2
      }
    ]
  },
  hair_beauty: {
    campaign_name: 'Beauty Blast 2025 - Hair & Beauty',
    utm_campaign: 'beauty_blast_hair_beauty',
    emails: [
      {
        subject: 'Free money for your salon?',
        body: `Hi,

Bit cheeky, but hear me out.

What if you could earn 10-25% commission from your beauty clients WITHOUT:
• Buying inventory
• Using shelf space
• Training staff
• Doing any selling

Sound too good to be true?

It's our Ambassador program:
→ We give you a branded poster with QR code
→ Put it in your salon/treatment room
→ Clients scan, order premium beauty supplements
→ You earn commission, we ship to them

Products: Organic mushrooms for beauty (Tremella = "beauty mushroom", Pearl Beauty Tonic, adaptogens)

Average partner earns $150-400/month passive income.

Apply here (2 min): https://teelixir.com.au/pages/teelixir-wholesale-support?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_hair_beauty

Worth exploring?

Jayson
Teelixir`,
        delay_in_days: 0
      },
      {
        subject: 'Beauty salons averaging $250-400/month',
        body: `Hi,

Quick data on what hair & beauty salons are earning as Teelixir Ambassadors:

**Average salon results:**
→ 4-8 orders per month
→ $250-400 commission monthly
→ Just from a poster in the salon

**Why it works in salons:**
Your clients already:
• Care about beauty & wellness
• Trust your recommendations
• Spend 30-60 min in your space (time to scan QR)
• Want "beauty from within" solutions

**The poster literally does the work:**
1. Client sits in chair
2. Sees poster about mushroom beauty supplements
3. Scans QR code
4. Orders online (free shipping over $100)
5. You get 10-25% commission

No selling, no inventory, no hassle.

**What partners love:**
✓ Complements their services (not competing)
✓ Builds their wellness brand
✓ Monthly samples to try products
✓ Clients appreciate the recommendation

Apply: https://teelixir.com.au/pages/teelixir-wholesale-support?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_hair_beauty

If it doesn't work? Literally zero loss.
If it does? $2,500-5,000/year extra income.

Jayson`,
        delay_in_days: 2
      },
      {
        subject: 'Why you haven\'t replied (probably)',
        body: `Hi,

I've reached out twice about the Teelixir Ambassador program.

You haven't replied, so let me guess what you're thinking:

**"Sounds too good to be true"**
→ Fair. But we have 300+ partners earning commission this way. It's how modern DTC brands grow.

**"My clients won't scan a QR code"**
→ QR adoption is 85%+ now (thanks, COVID menus). Our data shows 8-15% of people who see the poster scan it.

**"I don't want to be pushy or salesy"**
→ You literally don't mention it. Poster does the work. You're just offering an option.

**"What's the catch?"**
→ No catch. We need distribution, you have clients. We pay you for access.

**"Takes too much time to set up"**
→ 2-minute application. We design the poster. You put it up. Done.

**"What if nobody orders?"**
→ Then you made $0 and lost 2 minutes. But realistically, if you have 20+ clients/week, you'll get orders.

**"I'd rather stock products and make more"**
→ That's an option too (40% margins). But Ambassador has zero risk.

Still on the fence?

Just reply "send me info" and I'll share:
• Example earnings by business type
• Sample poster designs
• How commission tiers work
• Full partner testimonials

Or apply directly: https://teelixir.com.au/pages/teelixir-wholesale-support?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_hair_beauty

Your call.

Jayson

P.S. - Honest question: What would you need to see/know to feel comfortable trying this?`,
        delay_in_days: 2
      },
      {
        subject: 'Closing your file',
        body: `Hi,

This is my last email about the Teelixir Ambassador program.

I've reached out a few times, haven't heard back.

I'm going to assume it's not a fit for {{company_name}} right now.

Before I close your file, here's the TL;DR:
• Earn 10-25% commission from your existing clients
• We give you a QR code poster (free)
• No inventory, investment, or selling required
• Takes 2 minutes to apply
• Zero risk (if nobody orders, you lost nothing)

If you want to try it: https://teelixir.com.au/pages/teelixir-wholesale-support?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_hair_beauty

If not, no worries at all. I'll leave you alone.

Either way, all the best with {{company_name}}.

Jayson

---

P.S. - Quick reality check: In the 5 minutes it took you to read my 4 emails, you could've applied and had a poster up already earning commission. Just saying. 😊`,
        delay_in_days: 2
      }
    ]
  },
  cosmetic: {
    campaign_name: 'Beauty Blast 2025 - Cosmetic Pro',
    utm_campaign: 'beauty_blast_cosmetic',
    emails: [
      {
        subject: 'Passive income opportunity for cosmetic practices',
        body: `Hi,

Given your focus on cosmetic/aesthetic services, I wanted to share a zero-risk revenue opportunity.

Teelixir Ambassador Program:
• Earn 10-25% commission on client orders
• No inventory or upfront investment
• Custom QR code poster for your clinic
• We handle fulfillment & shipping
• Monthly sample sachets (so you can try everything)

We're Australia's leading organic adaptogen brand (8+ years, certified organic, third-party tested). Our products complement aesthetic treatments perfectly - think "beauty from within".

Many cosmetic clinics & med spas use this to:
→ Generate passive income from existing clients
→ Offer wellness products without stocking
→ Position themselves as holistic practitioners

Apply: https://teelixir.com.au/pages/teelixir-wholesale-support?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_cosmetic

(Takes 2 minutes, no commitment)

P.S. - If you'd rather stock products for retail (40% margins), that option exists too. But Ambassador is the easy entry point.

Jayson
Teelixir Ambassador Program`,
        delay_in_days: 0
      },
      {
        subject: 'Passive income for aesthetic practices',
        body: `Hi,

Wanted to share how cosmetic clinics are using Teelixir's Ambassador program.

**Why it works for aesthetic practices:**

Your clients already invest $300-1,500+ in treatments. They're HIGHLY motivated to support results with quality supplements.

**Typical clinic results:**
→ 5-10 orders per month
→ $300-600 commission monthly
→ Zero inventory or staff time required

**Perfect for your clientele:**
• Evidence-based adaptogens (not woo-woo)
• Certified organic, third-party tested
• Complements aesthetic treatments (beauty from within)
• Premium positioning aligns with your practice

**How it integrates:**
→ QR code poster in treatment rooms
→ Clients scan while waiting
→ We handle orders, shipping, customer service
→ You get 10-25% commission

**Products that resonate with aesthetic clients:**
• Tremella (internal skin hydration)
• Pearl Beauty Tonic (skin radiance)
• Schizandra Berry (skin nourishing)

Apply: https://teelixir.com.au/pages/teelixir-wholesale-support?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_cosmetic

Think of it as: $3,000-7,000/year passive income for putting up a poster.

Worth exploring?

Jayson
Teelixir Ambassador Program`,
        delay_in_days: 2
      },
      {
        subject: 'Why you haven\'t replied (probably)',
        body: `Hi,

I've reached out twice about the Teelixir Ambassador program.

You haven't replied, so let me guess what you're thinking:

**"Sounds too good to be true"**
→ Fair. But we have 300+ partners earning commission this way. It's how modern DTC brands grow.

**"My clients won't scan a QR code"**
→ QR adoption is 85%+ now (thanks, COVID menus). Our data shows 8-15% of people who see the poster scan it.

**"I don't want to be pushy or salesy"**
→ You literally don't mention it. Poster does the work. You're just offering an option.

**"What's the catch?"**
→ No catch. We need distribution, you have clients. We pay you for access.

**"Takes too much time to set up"**
→ 2-minute application. We design the poster. You put it up. Done.

**"What if nobody orders?"**
→ Then you made $0 and lost 2 minutes. But realistically, if you have 20+ clients/week, you'll get orders.

**"I'd rather stock products and make more"**
→ That's an option too (40% margins). But Ambassador has zero risk.

Still on the fence?

Just reply "send me info" and I'll share:
• Example earnings by business type
• Sample poster designs
• How commission tiers work
• Full partner testimonials

Or apply directly: https://teelixir.com.au/pages/teelixir-wholesale-support?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_cosmetic

Your call.

Jayson

P.S. - Honest question: What would you need to see/know to feel comfortable trying this?`,
        delay_in_days: 2
      },
      {
        subject: 'Closing your file',
        body: `Hi,

This is my last email about the Teelixir Ambassador program.

I've reached out a few times, haven't heard back.

I'm going to assume it's not a fit for {{company_name}} right now.

Before I close your file, here's the TL;DR:
• Earn 10-25% commission from your existing clients
• We give you a QR code poster (free)
• No inventory, investment, or selling required
• Takes 2 minutes to apply
• Zero risk (if nobody orders, you lost nothing)

If you want to try it: https://teelixir.com.au/pages/teelixir-wholesale-support?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_cosmetic

If not, no worries at all. I'll leave you alone.

Either way, all the best with {{company_name}}.

Jayson

---

P.S. - Quick reality check: In the 5 minutes it took you to read my 4 emails, you could've applied and had a poster up already earning commission. Just saying. 😊`,
        delay_in_days: 2
      }
    ]
  }
}

async function createCampaignWithLeads() {
  console.log('🚀 Creating Smartlead Campaigns via API\n')
  console.log('='.repeat(60))

  try {
    // Test API connection first
    console.log('\n🔗 Testing Smartlead API connection...')
    const health = await smartleadClient.healthCheck()
    if (!health.healthy) {
      console.error('❌ Smartlead API not connected')
      return
    }
    console.log('✅ Smartlead API connected\n')

    // Get existing campaigns to avoid duplicates
    const existingCampaigns = await smartleadClient.campaigns.list({ limit: 100 })
    console.log(`📋 Found ${existingCampaigns.results.length} existing campaigns\n`)

    const campaigns = [
      { file: 'massage_spa_leads.csv', template: 'massage_spa' },
      { file: 'hair_beauty_leads.csv', template: 'hair_beauty' },
      { file: 'cosmetic_leads.csv', template: 'cosmetic' }
    ]

    for (const campaign of campaigns) {
      const template = emailTemplates[campaign.template as keyof typeof emailTemplates]

      console.log(`\n${'='.repeat(60)}`)
      console.log(`📧 Campaign: ${template.campaign_name}`)
      console.log(`${'='.repeat(60)}`)

      // Check if campaign already exists
      const exists = existingCampaigns.results.find(c => c.name === template.campaign_name)
      if (exists) {
        console.log(`⚠️  Campaign already exists (ID: ${exists.id})`)
        console.log(`   Skipping creation. Delete manually if you want to recreate.`)
        continue
      }

      // Step 1: Create campaign
      console.log('\n1️⃣  Creating campaign...')
      const newCampaign = await smartleadClient.campaigns.create({
        name: template.campaign_name
      })
      console.log(`   ✅ Created campaign: ${newCampaign.id}`)

      // Step 2: Load CSV and prepare leads
      console.log('\n2️⃣  Loading leads from CSV...')
      const csvContent = readFileSync(campaign.file, 'utf-8')
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true
      })
      console.log(`   ✅ Loaded ${records.length} leads`)

      // Step 3: Upload leads in batches (Smartlead limit: 100 per request)
      console.log('\n3️⃣  Uploading leads to campaign...')
      const BATCH_SIZE = 100
      let totalUploaded = 0

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE)
        const leadList = batch.map((record: any) => ({
          email: record.email,
          first_name: '', // Not in database
          last_name: '', // Not in database
          company_name: record.name || record.business_name || '',
          custom_fields: {
            city: record.city || '',
            phone: record.phone || '',
            website: record.website || ''
          }
        }))

        try {
          const result = await smartleadClient.leads.add(newCampaign.id, {
            lead_list: leadList,
            ignore_duplicate_leads_in_other_campaign: false
          })
          totalUploaded += result.upload_count
          process.stdout.write(`\r   Uploaded: ${totalUploaded}/${records.length} leads`)
        } catch (error: any) {
          console.error(`\n   ❌ Error uploading batch ${i / BATCH_SIZE + 1}:`, error.message)
        }
      }
      console.log(`\n   ✅ Total uploaded: ${totalUploaded} leads`)

      // Step 4: Note about email sequences
      console.log('\n4️⃣  Email sequences:')
      console.log(`   ⚠️  Smartlead API doesn't support email sequence creation`)
      console.log(`   📝 You'll need to add these manually in the dashboard:`)
      console.log(`   👉 https://app.smartlead.ai/campaigns/${newCampaign.id}/sequence`)
      console.log(`\n   Email sequence for this campaign:`)
      template.emails.forEach((email, index) => {
        console.log(`\n   📧 Email ${index + 1} (Day ${email.delay_in_days === 0 ? 1 : 1 + email.delay_in_days}):`)
        console.log(`      Subject: ${email.subject}`)
        console.log(`      Delay: ${email.delay_in_days} days after previous email`)
      })

      console.log(`\n✅ Campaign created successfully!`)
      console.log(`   Campaign ID: ${newCampaign.id}`)
      console.log(`   Leads uploaded: ${totalUploaded}`)
      console.log(`   Dashboard: https://app.smartlead.ai/campaigns/${newCampaign.id}`)
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('✅ ALL CAMPAIGNS CREATED!')
    console.log(`${'='.repeat(60)}`)
    console.log('\n📋 Next steps:')
    console.log('1. Go to each campaign dashboard')
    console.log('2. Add email sequences (copy from console output above)')
    console.log('3. Configure sending schedule (Mon-Fri, 8am-6pm AEST)')
    console.log('4. Select email accounts (all 10 accounts, 540/day each)')
    console.log('5. Set tracking (Open: OFF, Click: ON, Reply: ON)')
    console.log('6. Save as DRAFT')
    console.log('7. Review and LAUNCH! 🚀\n')

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    console.error('Stack:', error.stack)
  }
}

createCampaignWithLeads()
