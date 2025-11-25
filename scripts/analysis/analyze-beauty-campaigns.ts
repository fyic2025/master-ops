#!/usr/bin/env tsx
/**
 * Analyze Beauty Campaign Performance
 *
 * Identifies best performing campaigns and creative approaches
 * for maximizing remaining 27K email quota over 5 days
 */

import { smartleadClient } from '../shared/libs/integrations/smartlead'

async function analyzeCampaigns() {
  console.log('📊 Analyzing Beauty Campaign Performance\n')
  console.log('='.repeat(70))

  const campaigns = await smartleadClient.campaigns.list()

  // Filter beauty-related campaigns
  const beautyCampaigns = campaigns.results?.filter((c: any) =>
    c.name.toLowerCase().includes('beauty') ||
    c.name.toLowerCase().includes('salon') ||
    c.name.toLowerCase().includes('spa') ||
    c.name.toLowerCase().includes('massage') ||
    c.name.toLowerCase().includes('cosmetic') ||
    c.name.toLowerCase().includes('laser') ||
    c.name.toLowerCase().includes('makeup') ||
    c.name.toLowerCase().includes('hair') ||
    c.name.toLowerCase().includes('tanning') ||
    c.name.toLowerCase().includes('injectables')
  ) || []

  console.log(`\n📈 Found ${beautyCampaigns.length} beauty-related campaigns\n`)

  const campaignStats: any[] = []

  for (const campaign of beautyCampaigns) {
    try {
      const analytics = await smartleadClient.analytics.getCampaignAnalytics(campaign.id)

      const totalSent = parseInt(analytics.unique_sent_count) || 0
      const replies = parseInt(analytics.reply_count) || 0
      const bounced = parseInt(analytics.bounce_count) || 0
      const replyRate = totalSent > 0 ? (replies / totalSent * 100) : 0
      const bounceRate = totalSent > 0 ? (bounced / totalSent * 100) : 0
      const deliveryRate = totalSent > 0 ? ((totalSent - bounced) / totalSent * 100) : 0

      campaignStats.push({
        name: campaign.name,
        id: campaign.id,
        status: campaign.status,
        totalLeads: parseInt(analytics.total_count) || 0,
        sentCount: parseInt(analytics.sent_count) || 0,
        uniqueSent: totalSent,
        replies,
        bounced,
        replyRate,
        bounceRate,
        deliveryRate,
        sequences: parseInt(analytics.sequence_count) || 0,
      })

      console.log(`✓ ${campaign.name}`)
    } catch (error: any) {
      console.log(`⚠️  ${campaign.name}: ${error.message}`)
    }
  }

  // Sort by reply rate
  campaignStats.sort((a, b) => b.replyRate - a.replyRate)

  console.log('\n' + '='.repeat(70))
  console.log('🏆 TOP PERFORMING CAMPAIGNS (by Reply Rate)')
  console.log('='.repeat(70))

  campaignStats.slice(0, 5).forEach((c, i) => {
    console.log(`\n${i + 1}. ${c.name}`)
    console.log(`   Status: ${c.status}`)
    console.log(`   Total Leads: ${c.totalLeads.toLocaleString()}`)
    console.log(`   Emails Sent: ${c.sentCount.toLocaleString()} (unique: ${c.uniqueSent.toLocaleString()})`)
    console.log(`   Replies: ${c.replies} (${c.replyRate.toFixed(2)}%)`)
    console.log(`   Bounced: ${c.bounced} (${c.bounceRate.toFixed(2)}%)`)
    console.log(`   Delivery Rate: ${c.deliveryRate.toFixed(2)}%`)
    console.log(`   Sequences: ${c.sequences}`)
  })

  console.log('\n' + '='.repeat(70))
  console.log('📊 OVERALL BEAUTY CAMPAIGN STATS')
  console.log('='.repeat(70))

  const totals = campaignStats.reduce((acc, c) => ({
    totalLeads: acc.totalLeads + c.totalLeads,
    totalSent: acc.totalSent + c.sentCount,
    totalUniqueSent: acc.totalUniqueSent + c.uniqueSent,
    totalReplies: acc.totalReplies + c.replies,
    totalBounced: acc.totalBounced + c.bounced,
  }), { totalLeads: 0, totalSent: 0, totalUniqueSent: 0, totalReplies: 0, totalBounced: 0 })

  console.log(`\nTotal Campaigns: ${campaignStats.length}`)
  console.log(`Total Leads: ${totals.totalLeads.toLocaleString()}`)
  console.log(`Total Emails Sent: ${totals.totalSent.toLocaleString()}`)
  console.log(`Unique Contacts Sent: ${totals.totalUniqueSent.toLocaleString()}`)
  console.log(`Total Replies: ${totals.totalReplies}`)
  console.log(`Average Reply Rate: ${(totals.totalReplies / totals.totalUniqueSent * 100).toFixed(2)}%`)
  console.log(`Total Bounced: ${totals.totalBounced} (${(totals.totalBounced / totals.totalUniqueSent * 100).toFixed(2)}%)`)
  console.log(`Delivery Rate: ${((totals.totalUniqueSent - totals.totalBounced) / totals.totalUniqueSent * 100).toFixed(2)}%`)

  console.log('\n' + '='.repeat(70))
  console.log('💡 RECOMMENDATIONS FOR 27K EMAIL BLAST')
  console.log('='.repeat(70))

  console.log('\n📌 Best Performing Segments:')
  const topThree = campaignStats.slice(0, 3)
  topThree.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.name.replace('is_', '').replace(/_/g, ' ')} - ${c.replyRate.toFixed(2)}% reply rate`)
  })

  console.log('\n📌 Quota Distribution Recommendation:')
  console.log(`   Based on ${totals.totalUniqueSent.toLocaleString()} contacts already reached`)
  console.log(`   Remaining quota: 27,000 emails over 5 days = 5,400 emails/day`)
  console.log(`   With 10 email accounts = 540 emails/account/day`)

  console.log('\n📌 Campaign Strategy:')
  console.log('   1. Focus on top 3 performing segments')
  console.log('   2. Use proven email sequences (2-3 step follow-ups)')
  console.log('   3. Target fresh leads not in completed campaigns')
  console.log('   4. Leverage 2.9% average reply rate for projections')

  console.log('\n' + '='.repeat(70))
}

analyzeCampaigns().catch(console.error)
