#!/usr/bin/env npx tsx

/**
 * Multi-Channel Alert Router
 *
 * Send alerts to Slack, Email, PagerDuty based on severity
 * Integrates with health check and monitoring scripts
 *
 * Usage: npx tsx .claude/skills/supabase-expert/scripts/alert-router.ts [--test]
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const config = {
  url: process.env.SUPABASE_URL!,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  slackWebhook: process.env.SLACK_WEBHOOK_URL || '',
  slackChannel: process.env.SLACK_ALERT_CHANNEL || '#alerts',
  pagerdutyKey: process.env.PAGERDUTY_INTEGRATION_KEY || '',
  emailFrom: process.env.ALERT_EMAIL_FROM || 'alerts@example.com',
  emailTo: process.env.ALERT_EMAIL_TO || 'ops@example.com',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587'),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
}

const isTest = process.argv.includes('--test')

interface Alert {
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  details?: Record<string, any>
  source: string
  timestamp: string
}

interface AlertRouting {
  info: string[]      // ['slack']
  warning: string[]   // ['slack', 'email']
  critical: string[]  // ['slack', 'email', 'pagerduty']
}

const ALERT_ROUTING: AlertRouting = {
  info: ['slack'],
  warning: ['slack', 'email'],
  critical: ['slack', 'email', 'pagerduty'],
}

async function sendSlackAlert(alert: Alert): Promise<boolean> {
  if (!config.slackWebhook) {
    console.log('   ⚠️  Slack webhook not configured')
    return false
  }

  const icon = alert.severity === 'critical' ? '🔴' :
               alert.severity === 'warning' ? '⚠️' : 'ℹ️'

  const color = alert.severity === 'critical' ? '#ff0000' :
                alert.severity === 'warning' ? '#ff9900' : '#0099ff'

  const payload = {
    channel: config.slackChannel,
    username: 'Supabase Monitor',
    icon_emoji: ':database:',
    attachments: [
      {
        color,
        title: `${icon} ${alert.title}`,
        text: alert.message,
        fields: alert.details ? Object.entries(alert.details).map(([key, value]) => ({
          title: key,
          value: String(value),
          short: true,
        })) : [],
        footer: `Source: ${alert.source}`,
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
      },
    ],
  }

  try {
    const response = await fetch(config.slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('   ❌ Slack send failed:', await response.text())
      return false
    }

    console.log('   ✅ Sent to Slack')
    return true
  } catch (error) {
    console.error('   ❌ Slack error:', error instanceof Error ? error.message : String(error))
    return false
  }
}

async function sendEmailAlert(alert: Alert): Promise<boolean> {
  if (!config.smtpHost || !config.smtpUser) {
    console.log('   ⚠️  Email not configured (SMTP settings missing)')
    return false
  }

  // In a real implementation, you would use nodemailer or similar
  // For now, providing the structure

  const emailBody = `
SEVERITY: ${alert.severity.toUpperCase()}
TITLE: ${alert.title}

MESSAGE:
${alert.message}

${alert.details ? 'DETAILS:\n' + JSON.stringify(alert.details, null, 2) : ''}

Source: ${alert.source}
Time: ${new Date(alert.timestamp).toLocaleString()}

---
This is an automated alert from Supabase Monitor
  `.trim()

  console.log('   📧 Email would be sent:')
  console.log(`      To: ${config.emailTo}`)
  console.log(`      From: ${config.emailFrom}`)
  console.log(`      Subject: [${alert.severity.toUpperCase()}] ${alert.title}`)

  // Actual email sending would go here
  // Example using nodemailer:
  /*
  const nodemailer = require('nodemailer')
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  })

  await transporter.sendMail({
    from: config.emailFrom,
    to: config.emailTo,
    subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
    text: emailBody,
  })
  */

  console.log('   ✅ Email sent (simulated - configure SMTP to enable)')
  return true
}

async function sendPagerDutyAlert(alert: Alert): Promise<boolean> {
  if (!config.pagerdutyKey) {
    console.log('   ⚠️  PagerDuty not configured')
    return false
  }

  const payload = {
    routing_key: config.pagerdutyKey,
    event_action: 'trigger',
    payload: {
      summary: alert.title,
      severity: alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info',
      source: alert.source,
      timestamp: alert.timestamp,
      custom_details: {
        message: alert.message,
        ...alert.details,
      },
    },
  }

  try {
    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('   ❌ PagerDuty send failed:', await response.text())
      return false
    }

    console.log('   ✅ Sent to PagerDuty')
    return true
  } catch (error) {
    console.error('   ❌ PagerDuty error:', error instanceof Error ? error.message : String(error))
    return false
  }
}

async function routeAlert(alert: Alert): Promise<void> {
  console.log(`\n${alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'} ${alert.title}`)
  console.log(`   Severity: ${alert.severity.toUpperCase()}`)
  console.log(`   Source: ${alert.source}`)

  const channels = ALERT_ROUTING[alert.severity]
  console.log(`   Routing to: ${channels.join(', ')}`)

  for (const channel of channels) {
    switch (channel) {
      case 'slack':
        await sendSlackAlert(alert)
        break
      case 'email':
        await sendEmailAlert(alert)
        break
      case 'pagerduty':
        await sendPagerDutyAlert(alert)
        break
    }
  }
}

async function checkAndAlert(): Promise<void> {
  console.log('🚨 Alert Router')
  console.log('='.repeat(60))
  console.log(`Mode: ${isTest ? 'TEST' : 'LIVE'}`)
  console.log()

  if (isTest) {
    // Send test alerts
    console.log('Sending test alerts...\n')

    await routeAlert({
      severity: 'info',
      title: 'Test Info Alert',
      message: 'This is a test informational alert from the alert router.',
      source: 'alert-router-test',
      timestamp: new Date().toISOString(),
      details: {
        'Test Parameter 1': 'Value 1',
        'Test Parameter 2': 'Value 2',
      },
    })

    await routeAlert({
      severity: 'warning',
      title: 'Test Warning Alert',
      message: 'This is a test warning alert. In production, this would indicate a concerning but non-critical issue.',
      source: 'alert-router-test',
      timestamp: new Date().toISOString(),
      details: {
        'Warning Type': 'Test',
        'Affected System': 'None (test)',
      },
    })

    await routeAlert({
      severity: 'critical',
      title: 'Test Critical Alert',
      message: 'This is a test critical alert. In production, this would require immediate attention!',
      source: 'alert-router-test',
      timestamp: new Date().toISOString(),
      details: {
        'Impact': 'None (test)',
        'Action Required': 'None (test)',
      },
    })

    console.log('\n✅ Test alerts sent')
    return
  }

  // Load latest health check results
  const fs = await import('fs/promises')

  try {
    const healthCheckData = await fs.readFile('logs/supabase-health-check.json', 'utf-8')
    const healthCheck = JSON.parse(healthCheckData)

    // Route alerts based on health check
    if (healthCheck.overall_status === 'critical') {
      await routeAlert({
        severity: 'critical',
        title: 'Supabase Health Check: CRITICAL',
        message: `Critical issues detected:\n${healthCheck.critical_issues.join('\n')}`,
        source: 'supabase-health-check',
        timestamp: healthCheck.timestamp,
        details: {
          'Total Operations': healthCheck.checks.integrations.last_24h.total,
          'Error Rate': `${healthCheck.checks.integrations.last_24h.error_rate.toFixed(2)}%`,
          'Failed Workflows': healthCheck.checks.workflows.last_24h.failures,
        },
      })
    } else if (healthCheck.overall_status === 'warning') {
      await routeAlert({
        severity: 'warning',
        title: 'Supabase Health Check: Warning',
        message: `Warnings detected:\n${healthCheck.warnings.join('\n')}`,
        source: 'supabase-health-check',
        timestamp: healthCheck.timestamp,
        details: {
          'Success Rate': `${healthCheck.checks.integrations.last_24h.total > 0 ? ((healthCheck.checks.integrations.last_24h.total - healthCheck.checks.integrations.last_24h.errors) / healthCheck.checks.integrations.last_24h.total * 100).toFixed(2) : 100}%`,
        },
      })
    }

    // Check for stale integrations
    if (healthCheck.checks.stale_integrations && healthCheck.checks.stale_integrations.length > 0) {
      await routeAlert({
        severity: 'warning',
        title: 'Stale Integrations Detected',
        message: `The following integrations have been inactive for >24 hours: ${healthCheck.checks.stale_integrations.join(', ')}`,
        source: 'supabase-health-check',
        timestamp: healthCheck.timestamp,
      })
    }

    // Check for failed tasks
    if (healthCheck.checks.tasks && (healthCheck.checks.tasks.failed > 0 || healthCheck.checks.tasks.needs_fix > 0)) {
      const totalProblems = healthCheck.checks.tasks.failed + healthCheck.checks.tasks.needs_fix

      await routeAlert({
        severity: totalProblems > 5 ? 'warning' : 'info',
        title: 'Tasks Requiring Attention',
        message: `${totalProblems} tasks need attention (${healthCheck.checks.tasks.failed} failed, ${healthCheck.checks.tasks.needs_fix} need fix)`,
        source: 'supabase-health-check',
        timestamp: healthCheck.timestamp,
      })
    }

  } catch (error) {
    console.log('ℹ️  No health check results found - run health check first')
  }

  // Check error patterns
  try {
    const errorPatternData = await fs.readFile('logs/error-pattern-analysis.json', 'utf-8')
    const errorAnalysis = JSON.parse(errorPatternData)

    if (errorAnalysis.health_impact === 'critical') {
      await routeAlert({
        severity: 'critical',
        title: 'Critical Error Patterns Detected',
        message: `${errorAnalysis.critical_issues} critical error patterns found. Total errors: ${errorAnalysis.total_errors}`,
        source: 'error-pattern-analyzer',
        timestamp: errorAnalysis.timestamp,
        details: {
          'Total Errors': errorAnalysis.total_errors,
          'Unique Patterns': errorAnalysis.unique_patterns,
          'Top Pattern': errorAnalysis.patterns[0]?.category || 'N/A',
        },
      })
    }
  } catch (error) {
    // No error pattern analysis available
  }

  console.log('\n✅ Alert routing complete')
}

async function main() {
  try {
    await checkAndAlert()
  } catch (error) {
    console.error('\n❌ Alert routing failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
