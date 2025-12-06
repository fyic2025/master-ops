/**
 * Example 7: Alerting System
 *
 * Demonstrates how to use Slack and Email alerting helpers:
 * - Send critical alerts
 * - Send integration failure alerts
 * - Send workflow failure alerts
 * - Send performance alerts
 * - Send daily/weekly summaries
 *
 * Run: npx tsx examples/07-alerting-system.ts
 *
 * Prerequisites:
 * - Set SLACK_WEBHOOK_URL in .env for Slack alerts
 * - Set EMAIL_* variables in .env for email alerts
 */

import { slackAlerter } from '../shared/libs/alerts/slack-alerts'
import { emailAlerter } from '../shared/libs/alerts/email-alerts'
import { logger } from '../shared/libs/logger'

async function main() {
  console.log('🔔 Alerting System Example\n')

  try {
    // ========================================
    // 1. Critical Alert
    // ========================================
    console.log('1️⃣  Sending critical alert...\n')

    await slackAlerter.sendCriticalAlert(
      'Database Connection Lost',
      'Unable to connect to Supabase database. All operations are failing.',
      {
        service: 'supabase',
        environment: 'production',
        metadata: {
          lastSuccessfulConnection: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          attemptedReconnections: 3
        }
      }
    )

    await emailAlerter.sendCriticalAlert(
      'Database Connection Lost',
      'Unable to connect to Supabase database. All operations are failing.',
      {
        service: 'supabase',
        environment: 'production',
        metadata: {
          lastSuccessfulConnection: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          attemptedReconnections: 3
        }
      }
    )

    console.log('✅ Critical alert sent\n')

    // ========================================
    // 2. Integration Failure Alert
    // ========================================
    console.log('2️⃣  Sending integration failure alert...\n')

    await slackAlerter.sendIntegrationFailure(
      'hubspot',
      'Rate limit exceeded: 100 requests per 10 seconds',
      15, // error count
      {
        businessSlug: 'teelixir',
        metadata: {
          endpoint: '/crm/v3/objects/contacts',
          rateLimitReset: new Date(Date.now() + 10 * 1000).toISOString()
        }
      }
    )

    await emailAlerter.sendIntegrationFailure(
      'hubspot',
      'Rate limit exceeded: 100 requests per 10 seconds',
      15,
      {
        businessSlug: 'teelixir',
        metadata: {
          endpoint: '/crm/v3/objects/contacts',
          rateLimitReset: new Date(Date.now() + 10 * 1000).toISOString()
        }
      }
    )

    console.log('✅ Integration failure alert sent\n')

    // ========================================
    // 3. Workflow Failure Alert
    // ========================================
    console.log('3️⃣  Sending workflow failure alert...\n')

    await slackAlerter.sendWorkflowFailure(
      'Daily Business Sync',
      'exec-123456',
      'TypeError: Cannot read property "id" of undefined at node "HubSpot Create Contact"',
      {
        businessSlug: 'chux',
        metadata: {
          failedNode: 'HubSpot Create Contact',
          workflowUrl: 'http://n8n.example.com/workflow/123'
        }
      }
    )

    await emailAlerter.sendWorkflowFailure(
      'Daily Business Sync',
      'exec-123456',
      'TypeError: Cannot read property "id" of undefined at node "HubSpot Create Contact"',
      {
        businessSlug: 'chux',
        metadata: {
          failedNode: 'HubSpot Create Contact',
          workflowUrl: 'http://n8n.example.com/workflow/123'
        }
      }
    )

    console.log('✅ Workflow failure alert sent\n')

    // ========================================
    // 4. Performance Alert
    // ========================================
    console.log('4️⃣  Sending performance alert...\n')

    await slackAlerter.sendPerformanceAlert(
      'hubspot',
      2500, // avg duration in ms
      1000, // threshold in ms
      {
        metadata: {
          operation: 'contacts.list',
          p95Duration: 3200,
          sampleSize: 150
        }
      }
    )

    await emailAlerter.sendPerformanceAlert(
      'hubspot',
      2500,
      1000,
      {
        metadata: {
          operation: 'contacts.list',
          p95Duration: 3200,
          sampleSize: 150
        }
      }
    )

    console.log('✅ Performance alert sent\n')

    // ========================================
    // 5. Daily Summary
    // ========================================
    console.log('5️⃣  Sending daily summary...\n')

    const slackDailySummary = {
      totalOperations: 1247,
      successRate: 98.5,
      errorCount: 19,
      topServices: [
        { service: 'hubspot', operations: 523 },
        { service: 'unleashed', operations: 412 },
        { service: 'n8n', operations: 312 }
      ]
    }

    const emailDailySummary = {
      totalOperations: 1247,
      successRate: 98.5,
      errorCount: 19,
      topServices: [
        { service: 'hubspot', count: 523 },
        { service: 'unleashed', count: 412 },
        { service: 'n8n', count: 312 }
      ],
      topErrors: [
        { message: 'Rate limit exceeded', count: 8 },
        { message: 'Connection timeout', count: 6 }
      ],
      healthStatus: {
        supabase: true,
        hubspot: true,
        n8n: false
      }
    }

    await slackAlerter.sendDailySummary(slackDailySummary)

    await emailAlerter.sendDailySummary(emailDailySummary)

    console.log('✅ Daily summary sent\n')

    // ========================================
    // 6. Weekly Report
    // ========================================
    console.log('6️⃣  Sending weekly report...\n')

    const weeklyReport = {
      period: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      totalOperations: 8432,
      successRate: 97.8,
      errorCount: 185,
      serviceStats: [
        {
          service: 'hubspot',
          operations: 3521,
          errors: 82,
          avgDuration: 450
        },
        {
          service: 'unleashed',
          operations: 2891,
          errors: 56,
          avgDuration: 680
        },
        {
          service: 'n8n',
          operations: 2020,
          errors: 47,
          avgDuration: 1200
        }
      ],
      businessStats: [
        { business: 'teelixir', operations: 2150, errors: 45 },
        { business: 'chux', operations: 1980, errors: 38 },
        { business: 'mojo', operations: 1820, errors: 52 },
        { business: 'vive', operations: 1680, errors: 50 }
      ],
      topErrors: [
        { message: 'Rate limit exceeded', count: 52, service: 'hubspot' },
        { message: 'Connection timeout', count: 38, service: 'unleashed' },
        { message: 'Invalid response format', count: 29, service: 'hubspot' }
      ],
      improvements: [
        'Reduced average response time by 15%',
        'Implemented better error handling for rate limits',
        'Added automatic retry logic for transient failures'
      ],
      issues: [
        'HubSpot rate limits hit 52 times - consider implementing better throttling',
        'Unleashed connection timeouts increasing - investigate network issues',
        'n8n workflow "Daily Sync" failed 3 times this week'
      ]
    }

    await emailAlerter.sendWeeklyReport(weeklyReport, {
      environment: 'production'
    })

    console.log('✅ Weekly report sent\n')

    // ========================================
    // 7. Generic Alert
    // ========================================
    console.log('7️⃣  Sending generic alert...\n')

    await slackAlerter.sendCriticalAlert(
      'Custom Alert',
      'This is a custom alert message with flexible content.',
      {
        service: 'teelixir',
        metadata: {
          customField: 'value',
          timestamp: new Date().toISOString()
        }
      }
    )

    await emailAlerter.sendAlert(
      'Custom Alert',
      'This is a custom alert message with flexible content.',
      {
        businessSlug: 'teelixir',
        metadata: {
          customField: 'value',
          timestamp: new Date().toISOString()
        }
      }
    )

    console.log('✅ Generic alert sent\n')

    // ========================================
    // Summary
    // ========================================
    console.log('✅ Alerting system example completed!\n')

    console.log('💡 Available Slack alerting functions:')
    console.log('   - slackAlerter.sendCriticalAlert(title, message, context)')
    console.log('   - slackAlerter.sendIntegrationFailure(service, error, count, context)')
    console.log('   - slackAlerter.sendWorkflowFailure(name, execId, error, context)')
    console.log('   - slackAlerter.sendPerformanceAlert(service, avgDuration, threshold, context)')
    console.log('   - slackAlerter.sendDailySummary(summary, context)')
    console.log('   - slackAlerter.sendAlert(subject, message, context)')
    console.log('')

    console.log('💡 Available Email alerting functions:')
    console.log('   - emailAlerter.sendCriticalAlert(title, message, context, recipients)')
    console.log('   - emailAlerter.sendIntegrationFailure(service, error, count, context, recipients)')
    console.log('   - emailAlerter.sendWorkflowFailure(name, execId, error, context, recipients)')
    console.log('   - emailAlerter.sendPerformanceAlert(service, avgDuration, threshold, context, recipients)')
    console.log('   - emailAlerter.sendDailySummary(summary, context, recipients)')
    console.log('   - emailAlerter.sendWeeklyReport(report, context, recipients)')
    console.log('   - emailAlerter.sendAlert(subject, message, context, recipients)')
    console.log('')

    console.log('⚙️  Configuration:')
    console.log('   Slack: Set SLACK_WEBHOOK_URL in .env')
    console.log('   Email: Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM, EMAIL_TO in .env')

  } catch (error) {
    console.error('\n❌ Error:', error)
    logger.error('Alerting system example failed', {
      source: 'example',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    }, error as Error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { main }
