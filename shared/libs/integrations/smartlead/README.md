

# Smartlead Integration

Complete TypeScript integration for Smartlead cold email outreach platform.

## Features

- ✅ Full TypeScript type safety
- ✅ Automatic rate limiting (10 req/2s)
- ✅ Built-in retry logic with exponential backoff
- ✅ Comprehensive error handling
- ✅ Logging and monitoring
- ✅ Lead management
- ✅ Campaign management
- ✅ Email account management
- ✅ Analytics and statistics
- ✅ Webhook support
- ✅ Inbox/reply management

## Installation

```bash
# Install dependencies (already in project)
npm install dotenv
```

## Configuration

Add to your `.env` file:

```bash
SMARTLEAD_API_KEY=your_api_key_here
```

Get your API key from: https://app.smartlead.ai/app/settings/profile

**Note:** Smartlead PRO plan is required for API access.

## Quick Start

```typescript
import { smartleadClient } from '@/shared/libs/integrations/smartlead'

// List all campaigns
const campaigns = await smartleadClient.campaigns.list()

// Add leads to campaign
const result = await smartleadClient.leads.add('campaign-id', {
  lead_list: [
    {
      email: 'prospect@company.com',
      first_name: 'John',
      last_name: 'Doe',
      company_name: 'Acme Inc',
      custom_fields: {
        industry: 'Technology',
        company_size: '50-100'
      }
    }
  ],
  ignore_duplicate_leads_in_other_campaign: true
})

// Get campaign analytics
const analytics = await smartleadClient.analytics.getCampaignAnalytics('campaign-id')
console.log(`Reply rate: ${analytics.reply_rate}%`)
```

## API Reference

### Lead Management

```typescript
// Add leads to campaign (max 100 per request)
await smartleadClient.leads.add(campaignId, {
  lead_list: [{ email: 'test@example.com', first_name: 'Test' }],
  ignore_global_block_list: false,
  ignore_unsubscribe_list: false,
  ignore_duplicate_leads_in_other_campaign: true
})

// Get lead by email
const lead = await smartleadClient.leads.getByEmail('test@example.com')

// List campaign leads
const leads = await smartleadClient.leads.list(campaignId, {
  offset: 0,
  limit: 100
})

// Resume paused lead
await smartleadClient.leads.resume(campaignId, leadId, 2) // 2 days delay

// Pause lead
await smartleadClient.leads.pause(campaignId, leadId)

// Delete lead from campaign
await smartleadClient.leads.delete(campaignId, leadId)

// Unsubscribe lead
await smartleadClient.leads.unsubscribeFromCampaign(campaignId, leadId)
await smartleadClient.leads.unsubscribeFromAll(leadId)

// Get lead categories
const categories = await smartleadClient.leads.getCategories()

// Get campaigns for a lead
const leadCampaigns = await smartleadClient.leads.getCampaigns(leadId)
```

### Campaign Management

```typescript
// Get campaign
const campaign = await smartleadClient.campaigns.get(campaignId)

// List campaigns
const campaigns = await smartleadClient.campaigns.list({ limit: 50 })

// Create campaign
const newCampaign = await smartleadClient.campaigns.create({
  name: 'Q1 2025 Outreach',
  client_id: 'optional-client-id'
})

// Update campaign schedule
await smartleadClient.campaigns.updateSchedule(campaignId, {
  timezone: 'America/New_York',
  days_of_the_week: [1, 2, 3, 4, 5], // Mon-Fri
  start_hour: 9,
  end_hour: 17,
  min_time_btw_emails: 120, // 2 hours
  max_new_leads_per_day: 50
})

// Update campaign settings
await smartleadClient.campaigns.updateSettings(campaignId, {
  track_settings: { open: true, click: true },
  stop_lead_settings: {
    stop_on_reply: true,
    stop_on_auto_reply: false,
    stop_on_link_click: false
  },
  send_as_plain_text: false,
  follow_up_percentage: 80
})

// Delete campaign
await smartleadClient.campaigns.delete(campaignId)

// Get campaign sequence
const sequence = await smartleadClient.campaigns.getSequence(campaignId)

// Save campaign sequence
await smartleadClient.campaigns.saveSequence(campaignId, {
  sequences: [
    {
      seq_number: 1,
      seq_delay_details: { delay_in_days: 0 },
      seq_variants: [
        {
          subject: 'Initial outreach',
          email_body: 'Hi {{first_name}}, ...'
        }
      ]
    },
    {
      seq_number: 2,
      seq_delay_details: { delay_in_days: 3 },
      seq_variants: [
        {
          subject: 'Following up',
          email_body: 'Just following up...'
        }
      ]
    }
  ]
})
```

### Email Account Management

```typescript
// List email accounts
const accounts = await smartleadClient.emailAccounts.list()

// Create email account
const account = await smartleadClient.emailAccounts.create({
  from_name: 'John Doe',
  from_email: 'john@company.com',
  user_name: 'john@company.com',
  password: 'app-password',
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  imap_host: 'imap.gmail.com',
  imap_port: 993,
  max_email_per_day: 50,
  warmup_enabled: true,
  daily_rampup: 2,
  reply_rate_percentage: 30
})

// Update email account
await smartleadClient.emailAccounts.update(accountId, {
  max_email_per_day: 100,
  signature: '<p>Best regards,<br>John Doe</p>'
})

// Get warmup statistics
const warmupStats = await smartleadClient.emailAccounts.getWarmupStats(accountId)

// Add email accounts to campaign
await smartleadClient.emailAccounts.addToCampaign(campaignId, [accountId1, accountId2])

// Remove email accounts from campaign
await smartleadClient.emailAccounts.removeFromCampaign(campaignId, [accountId1])
```

### Analytics & Statistics

```typescript
// Get campaign statistics
const stats = await smartleadClient.analytics.getCampaignStats(campaignId, {
  offset: 0,
  limit: 100,
  email_status: 'replied'
})

// Get analytics by date range
const dateStats = await smartleadClient.analytics.getByDateRange(
  campaignId,
  '2025-01-01',
  '2025-01-31'
)

// Get comprehensive campaign analytics
const analytics = await smartleadClient.analytics.getCampaignAnalytics(campaignId)
console.log({
  totalLeads: analytics.total_leads,
  contacted: analytics.leads_contacted,
  openRate: analytics.open_rate,
  replyRate: analytics.reply_rate
})

// Get lead message history
const history = await smartleadClient.analytics.getMessageHistory(campaignId, leadId)

// Export campaign data (CSV)
const csvData = await smartleadClient.analytics.exportLeads(campaignId)
```

### Inbox/Reply Management

```typescript
// Reply to a lead
await smartleadClient.inbox.reply(campaignId, {
  email_stats_id: 'stats-id',
  email_body: 'Thank you for your reply...',
  reply_message_id: 'message-id',
  reply_email_time: '2025-01-15T10:30:00Z',
  reply_email_body: 'Original reply text',
  cc: ['cc@example.com'],
  add_signature: true
})
```

### Webhook Management

```typescript
// Add webhook to campaign
const webhook = await smartleadClient.webhooks.addToCampaign(
  campaignId,
  'https://your-domain.com/webhooks/smartlead',
  ['EMAIL_REPLY', 'EMAIL_LINK_CLICK', 'LEAD_UNSUBSCRIBED']
)

// List campaign webhooks
const webhooks = await smartleadClient.webhooks.listForCampaign(campaignId)
```

## Webhook Event Types

Smartlead supports the following webhook events:

- `EMAIL_SENT` - Email successfully sent
- `EMAIL_OPEN` - Lead opened email
- `EMAIL_LINK_CLICK` - Lead clicked link in email
- `EMAIL_REPLY` - Lead replied to email
- `LEAD_UNSUBSCRIBED` - Lead unsubscribed
- `LEAD_CATEGORY_UPDATED` - Lead category changed

## Rate Limits

- **Rate Limit:** 10 requests per 2 seconds
- **Automatic handling:** Built-in rate limiter queues requests
- **Retry logic:** Automatic retries with exponential backoff

## Error Handling

All methods throw `IntegrationError` with detailed information:

```typescript
try {
  await smartleadClient.leads.add(campaignId, { lead_list: leads })
} catch (error) {
  if (error.category === 'AUTH_ERROR') {
    console.error('Invalid API key')
  } else if (error.category === 'RATE_LIMIT') {
    console.error('Rate limit exceeded')
  } else {
    console.error('API error:', error.message)
  }
}
```

## Health Check

```typescript
const health = await smartleadClient.healthCheck()
console.log(health.healthy) // true/false
```

## Metrics

```typescript
const metrics = smartleadClient.getMetrics()
console.log({
  service: metrics.service,
  rateLimiterEnabled: metrics.rateLimiter.enabled,
  availableTokens: metrics.rateLimiter.availableTokens
})
```

## Best Practices

### 1. Batch Lead Uploads

Add up to 100 leads per request:

```typescript
const leads = [...] // Your lead list

for (let i = 0; i < leads.length; i += 100) {
  const batch = leads.slice(i, i + 100)

  await smartleadClient.leads.add(campaignId, {
    lead_list: batch,
    ignore_duplicate_leads_in_other_campaign: true
  })

  // Small delay between batches (optional, rate limiter handles this)
  await new Promise(resolve => setTimeout(resolve, 500))
}
```

### 2. Monitor Campaign Performance

```typescript
async function getCampaignPerformance(campaignId: string) {
  const analytics = await smartleadClient.analytics.getCampaignAnalytics(campaignId)

  return {
    campaign: analytics.campaign_name,
    sent: analytics.leads_contacted,
    openRate: `${analytics.open_rate.toFixed(2)}%`,
    replyRate: `${analytics.reply_rate.toFixed(2)}%`,
    bounceRate: `${analytics.bounce_rate.toFixed(2)}%`,
    totalReplies: analytics.unique_replies
  }
}
```

### 3. Set Up Webhooks for Real-Time Events

```typescript
// Register webhook for important events
await smartleadClient.webhooks.addToCampaign(
  campaignId,
  'https://your-domain.com/webhooks/smartlead',
  ['EMAIL_REPLY', 'LEAD_UNSUBSCRIBED']
)

// Handle webhook in your endpoint
app.post('/webhooks/smartlead', (req, res) => {
  const { event_type, lead_email, campaign_id } = req.body

  if (event_type === 'EMAIL_REPLY') {
    // Update your CRM, trigger automation, etc.
    console.log(`Reply received from ${lead_email}`)
  }

  res.sendStatus(200)
})
```

### 4. Proper Email Warmup

```typescript
// Start with conservative warmup settings
await smartleadClient.emailAccounts.updateWarmup(accountId, {
  total_warmup_per_day: 20,
  daily_rampup: 2,
  reply_rate_percentage: 30
})

// Monitor warmup stats
const stats = await smartleadClient.emailAccounts.getWarmupStats(accountId)
console.log('Warmup performance:', stats.stats_by_date)
```

## Integration with HubSpot

See the n8n workflow template: `infra/n8n-workflows/templates/smartlead-hubspot-sync.json`

The workflow automatically:
1. Listens for Smartlead webhook events
2. Enriches lead data
3. Updates HubSpot contacts with engagement data
4. Tracks email opens, clicks, and replies
5. Logs all operations to Supabase

## Troubleshooting

### API Key Issues

```bash
# Verify your API key
curl "https://server.smartlead.ai/api/v1/campaigns?api_key=YOUR_KEY"
```

### Rate Limiting

The client automatically handles rate limiting, but if you encounter issues:

```typescript
// Check available rate limiter tokens
const metrics = smartleadClient.getMetrics()
console.log('Available tokens:', metrics.rateLimiter.availableTokens)
```

### Connection Issues

```typescript
// Run health check
const health = await smartleadClient.healthCheck()
if (!health.healthy) {
  console.error('Smartlead API unhealthy:', health.details)
}
```

## API Documentation

Full Smartlead API documentation:
- https://helpcenter.smartlead.ai/en/articles/125-full-api-documentation
- https://api.smartlead.ai/reference

## Support

For Smartlead-specific issues:
- Help Center: https://helpcenter.smartlead.ai
- Support Email: support@smartlead.ai

For integration issues within this project, check:
- Supabase logs: `integration_logs` table
- n8n execution history: https://automation.growthcohq.com/executions
