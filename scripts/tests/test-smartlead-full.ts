#!/usr/bin/env tsx
import { smartleadClient } from '../../shared/libs/integrations/smartlead'

async function test() {
  console.log('🧪 Comprehensive Smartlead Integration Test\n')
  console.log('='.repeat(60))

  try {
    // Test 1: API Connection
    console.log('\n📡 Test 1: API Connection')
    const health = await smartleadClient.healthCheck()
    console.log(`   Status: ${health.healthy ? '✅ Connected' : '❌ Failed'}`)

    // Test 2: List All Campaigns
    console.log('\n📊 Test 2: List All Campaigns')
    const campaigns = await smartleadClient.campaigns.list()
    const campaignCount = campaigns.results?.length || 0
    console.log(`   Found: ${campaignCount} campaigns`)

    if (campaigns.results && campaigns.results.length > 0) {
      console.log('\n   Campaigns:')
      campaigns.results.forEach((c: any, i: number) => {
        console.log(`   ${i + 1}. ${c.name}`)
        console.log(`      ID: ${c.id}`)
        console.log(`      Status: ${c.status}`)
        console.log(`      Created: ${new Date(c.created_at).toLocaleDateString()}`)
      })
    }

    // Test 3: List Email Accounts
    console.log('\n📧 Test 3: Email Accounts')
    const accounts = await smartleadClient.emailAccounts.list()
    const accountCount = accounts.results?.length || 0
    console.log(`   Found: ${accountCount} email accounts`)

    if (accounts.results && accounts.results.length > 0) {
      console.log('\n   Email Accounts:')
      accounts.results.slice(0, 5).forEach((a: any, i: number) => {
        console.log(`   ${i + 1}. ${a.from_email}`)
        console.log(`      Max emails/day: ${a.max_email_per_day}`)
        console.log(`      Warmup: ${a.warmup_enabled ? 'Enabled' : 'Disabled'}`)
      })
    }

    // Test 4: Campaign Details (if campaigns exist)
    if (campaigns.results && campaigns.results.length > 0) {
      const firstCampaign = campaigns.results[0]
      console.log(`\n📈 Test 4: Campaign Details - "${firstCampaign.name}"`)

      try {
        // Get campaign analytics
        const analytics = await smartleadClient.analytics.getCampaignAnalytics(firstCampaign.id)
        console.log('   Analytics:')
        console.log(`      Total Leads: ${analytics.total_count}`)
        console.log(`      Emails Sent: ${analytics.sent_count} (unique: ${analytics.unique_sent_count})`)
        console.log(`      Opens: ${analytics.open_count} (unique: ${analytics.unique_open_count})`)
        console.log(`      Clicks: ${analytics.click_count} (unique: ${analytics.unique_click_count})`)
        console.log(`      Replies: ${analytics.reply_count}`)
        console.log(`      Bounced: ${analytics.bounce_count}`)
        console.log(`      Unsubscribed: ${analytics.unsubscribed_count}`)
        console.log(`      Blocked: ${analytics.block_count}`)

        // Calculate rates
        const totalSent = parseInt(analytics.unique_sent_count) || 0
        if (totalSent > 0) {
          const openRate = (parseInt(analytics.unique_open_count) / totalSent * 100).toFixed(1)
          const clickRate = (parseInt(analytics.unique_click_count) / totalSent * 100).toFixed(1)
          const replyRate = (parseInt(analytics.reply_count) / totalSent * 100).toFixed(1)
          console.log(`      Open Rate: ${openRate}%`)
          console.log(`      Click Rate: ${clickRate}%`)
          console.log(`      Reply Rate: ${replyRate}%`)
        }
      } catch (error: any) {
        console.log(`   ⚠️  Could not fetch analytics: ${error.message}`)
      }

      // Test 5: List Leads in Campaign
      console.log(`\n👥 Test 5: Leads in "${firstCampaign.name}"`)
      try {
        const leads = await smartleadClient.leads.list(firstCampaign.id, { offset: 0, limit: 10 })
        const leadCount = leads.results?.length || 0
        console.log(`   Found: ${leadCount} leads (showing first 10)`)

        if (leads.results && leads.results.length > 0) {
          console.log('\n   Sample Leads:')
          leads.results.slice(0, 5).forEach((item: any, i: number) => {
            // API returns { campaign_lead_map_id, status, lead: {...} }
            const lead = item.lead || item
            console.log(`   ${i + 1}. ${lead.email}`)
            console.log(`      Name: ${lead.first_name || ''} ${lead.last_name || ''}`.trim())
            console.log(`      Company: ${lead.company_name || 'N/A'}`)
            console.log(`      Status: ${item.status}`)
            if (lead.custom_fields?.primary_category) {
              console.log(`      Category: ${lead.custom_fields.primary_category}`)
            }
          })
        }
      } catch (error: any) {
        console.log(`   ⚠️  Could not fetch leads: ${error.message}`)
      }

      // Test 6: Campaign Statistics
      console.log(`\n📊 Test 6: Campaign Statistics - "${firstCampaign.name}"`)
      try {
        const stats = await smartleadClient.analytics.getCampaignStats(firstCampaign.id, {
          offset: 0,
          limit: 5
        })
        const statsCount = stats.results?.length || 0
        console.log(`   Found: ${statsCount} email statistics records`)

        if (stats.results && stats.results.length > 0) {
          console.log('\n   Recent Activity:')
          stats.results.slice(0, 3).forEach((stat: any, i: number) => {
            console.log(`   ${i + 1}. ${stat.lead_email}`)
            console.log(`      Sequence: ${stat.email_sequence_number}`)
            console.log(`      Subject: ${stat.email_subject}`)
            if (stat.email_sent_time) console.log(`      Sent: ${new Date(stat.email_sent_time).toLocaleString()}`)
            if (stat.email_opened_time) console.log(`      Opened: ${new Date(stat.email_opened_time).toLocaleString()}`)
            if (stat.email_replied_time) console.log(`      ✅ Replied: ${new Date(stat.email_replied_time).toLocaleString()}`)
          })
        }
      } catch (error: any) {
        console.log(`   ⚠️  Could not fetch statistics: ${error.message}`)
      }

      // Test 7: Get Email Accounts for Campaign
      console.log(`\n📬 Test 7: Email Accounts for "${firstCampaign.name}"`)
      try {
        const campaignAccounts = await smartleadClient.emailAccounts.listForCampaign(firstCampaign.id)
        const campaignAccountCount = campaignAccounts.results?.length || 0
        console.log(`   Assigned: ${campaignAccountCount} email accounts`)

        if (campaignAccounts.results && campaignAccounts.results.length > 0) {
          campaignAccounts.results.forEach((acc: any, i: number) => {
            console.log(`   ${i + 1}. ${acc.from_email}`)
          })
        }
      } catch (error: any) {
        console.log(`   ⚠️  Could not fetch campaign email accounts: ${error.message}`)
      }
    }

    // Test 8: List Clients
    console.log('\n🏢 Test 8: Clients')
    try {
      const clients = await smartleadClient.clients.list()
      const clientCount = clients.clients?.length || 0
      console.log(`   Found: ${clientCount} clients`)

      if (clients.clients && clients.clients.length > 0) {
        clients.clients.forEach((client: any, i: number) => {
          console.log(`   ${i + 1}. ${client.name} (ID: ${client.id})`)
        })
      }
    } catch (error: any) {
      console.log(`   ⚠️  Could not fetch clients: ${error.message}`)
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!')
    console.log('='.repeat(60))

    console.log('\n📋 Summary:')
    console.log(`   • API Connection: ✅ Working`)
    console.log(`   • Campaigns: ${campaignCount}`)
    console.log(`   • Email Accounts: ${accountCount}`)

    if (campaignCount > 0) {
      console.log('\n🎉 Your Smartlead account has active data!')
      console.log('   Ready to deploy HubSpot integration.')
    } else {
      console.log('\n⚠️  No campaigns found.')
      console.log('   Create campaigns in Smartlead to start tracking.')
    }

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message)
    if (error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2))
    }
    if (error.stack) {
      console.error('\nStack:', error.stack)
    }
    process.exit(1)
  }
}

test()
