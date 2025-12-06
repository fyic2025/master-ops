/**
 * Slack Alert Templates
 *
 * Pre-built alert templates for Slack notifications with rich formatting.
 *
 * Usage:
 * ```typescript
 * import { sendSlackAlert, AlertType } from '@/shared/libs/alerts/slack-alerts'
 *
 * await sendSlackAlert(AlertType.ERROR, {
 *   service: 'hubspot',
 *   message: 'API connection failed',
 *   details: { errorCount: 5 }
 * })
 * ```
 */

import { logger } from '../logger'

export enum AlertType {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  SUCCESS = 'success'
}

export enum AlertCategory {
  SYSTEM_HEALTH = 'system_health',
  INTEGRATION_FAILURE = 'integration_failure',
  WORKFLOW_FAILURE = 'workflow_failure',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  DATA_SYNC = 'data_sync',
  SECURITY = 'security'
}

export interface AlertContext {
  service?: string
  operation?: string
  errorCount?: number
  duration?: number
  businessId?: string
  workflowId?: string
  [key: string]: any
}

export interface SlackMessage {
  channel?: string
  text: string
  blocks?: any[]
  attachments?: any[]
}

class SlackAlerter {
  private webhookUrl: string
  private defaultChannel: string

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || ''
    this.defaultChannel = process.env.SLACK_DEFAULT_CHANNEL || '#alerts'

    if (!this.webhookUrl) {
      console.warn('SLACK_WEBHOOK_URL not configured. Slack alerts will be logged only.')
    }
  }

  /**
   * Get emoji for alert type
   */
  private getEmoji(type: AlertType): string {
    const emojis = {
      [AlertType.CRITICAL]: ':rotating_light:',
      [AlertType.ERROR]: ':x:',
      [AlertType.WARNING]: ':warning:',
      [AlertType.INFO]: ':information_source:',
      [AlertType.SUCCESS]: ':white_check_mark:'
    }
    return emojis[type]
  }

  /**
   * Get color for alert type
   */
  private getColor(type: AlertType): string {
    const colors = {
      [AlertType.CRITICAL]: '#FF0000',
      [AlertType.ERROR]: '#DC143C',
      [AlertType.WARNING]: '#FFA500',
      [AlertType.INFO]: '#1E90FF',
      [AlertType.SUCCESS]: '#32CD32'
    }
    return colors[type]
  }

  /**
   * Send raw Slack message
   */
  async sendMessage(message: SlackMessage): Promise<void> {
    if (!this.webhookUrl) {
      logger.warn('Slack webhook not configured, alert logged only', {
        source: 'system',
        operation: 'slackAlert',
        metadata: message
      })
      return
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: message.channel || this.defaultChannel,
          ...message
        })
      })

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`)
      }

      logger.info('Slack alert sent', {
        source: 'system',
        operation: 'slackAlert',
        metadata: { channel: message.channel || this.defaultChannel }
      })

    } catch (error) {
      logger.error('Failed to send Slack alert', {
        source: 'system',
        operation: 'slackAlert'
      }, error as Error)
      throw error
    }
  }

  /**
   * Critical system outage
   */
  async sendCriticalAlert(
    title: string,
    message: string,
    context?: AlertContext,
    channel?: string
  ): Promise<void> {
    const emoji = this.getEmoji(AlertType.CRITICAL)

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} CRITICAL ALERT`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${title}*\n\n${message}`
        }
      }
    ]

    if (context) {
      const fields = []
      if (context.service) fields.push({ type: 'mrkdwn', text: `*Service:*\n${context.service}` })
      if (context.operation) fields.push({ type: 'mrkdwn', text: `*Operation:*\n${context.operation}` })
      if (context.errorCount) fields.push({ type: 'mrkdwn', text: `*Errors:*\n${context.errorCount}` })
      if (context.duration) fields.push({ type: 'mrkdwn', text: `*Duration:*\n${context.duration}ms` })

      if (fields.length > 0) {
        blocks.push({
          type: 'section',
          fields
        })
      }
    }

    // Add action buttons
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Logs', emoji: true },
          url: `${process.env.APP_URL}/logs?service=${context?.service || ''}`
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Health Check', emoji: true },
          url: `${process.env.APP_URL}/health`
        }
      ]
    })

    await this.sendMessage({
      channel: channel || '#critical-alerts',
      text: `${emoji} CRITICAL: ${title}`,
      blocks
    })
  }

  /**
   * Integration failure alert
   */
  async sendIntegrationFailure(
    service: string,
    errorMessage: string,
    errorCount: number,
    context?: AlertContext
  ): Promise<void> {
    const emoji = errorCount >= 10 ? this.getEmoji(AlertType.CRITICAL) : this.getEmoji(AlertType.ERROR)

    await this.sendMessage({
      text: `${emoji} Integration Failure: ${service}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} Integration Failure`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Service:*\n${service}` },
            { type: 'mrkdwn', text: `*Error Count:*\n${errorCount}` },
            { type: 'mrkdwn', text: `*Latest Error:*\n${errorMessage}` },
            { type: 'mrkdwn', text: `*Time:*\n${new Date().toLocaleString()}` }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Action Required:*\n\`\`\`\nops logs --source=${service} --errors-only -n 20\nops test-integration ${service}\n\`\`\``
          }
        }
      ]
    })
  }

  /**
   * Workflow failure alert
   */
  async sendWorkflowFailure(
    workflowName: string,
    executionId: string,
    errorMessage: string,
    context?: AlertContext
  ): Promise<void> {
    await this.sendMessage({
      text: `:x: Workflow Failed: ${workflowName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: ':x: Workflow Execution Failed',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Workflow:*\n${workflowName}` },
            { type: 'mrkdwn', text: `*Execution ID:*\n${executionId}` },
            { type: 'mrkdwn', text: `*Error:*\n${errorMessage}` },
            { type: 'mrkdwn', text: `*Time:*\n${new Date().toLocaleString()}` }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View in n8n', emoji: true },
              url: `${process.env.N8N_BASE_URL}/execution/${executionId}`
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Logs', emoji: true },
              url: `${process.env.APP_URL}/logs?workflow=${context?.workflowId}`
            }
          ]
        }
      ]
    })
  }

  /**
   * Performance degradation alert
   */
  async sendPerformanceAlert(
    service: string,
    avgDuration: number,
    threshold: number,
    context?: AlertContext
  ): Promise<void> {
    await this.sendMessage({
      text: `:warning: Performance Degradation: ${service}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: ':warning: Performance Degradation Detected',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Service:*\n${service}` },
            { type: 'mrkdwn', text: `*Average Duration:*\n${avgDuration}ms` },
            { type: 'mrkdwn', text: `*Threshold:*\n${threshold}ms` },
            { type: 'mrkdwn', text: `*Slowdown:*\n${Math.round((avgDuration / threshold - 1) * 100)}%` }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Investigate:*\n\`\`\`\nops stats\nops logs --source=${service}\n\`\`\``
          }
        }
      ]
    })
  }

  /**
   * Success notification
   */
  async sendSuccessNotification(
    title: string,
    message: string,
    context?: AlertContext
  ): Promise<void> {
    await this.sendMessage({
      channel: '#notifications',
      text: `:white_check_mark: ${title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:white_check_mark: *${title}*\n\n${message}`
          }
        }
      ]
    })
  }

  /**
   * Daily summary
   */
  async sendDailySummary(summary: {
    totalOperations: number
    successRate: number
    errorCount: number
    topServices: Array<{ service: string; operations: number }>
  }): Promise<void> {
    const emoji = summary.successRate >= 95 ? ':white_check_mark:' : summary.successRate >= 85 ? ':warning:' : ':x:'

    await this.sendMessage({
      channel: '#daily-reports',
      text: `${emoji} Daily Operations Summary`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} Daily Operations Summary`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Total Operations:*\n${summary.totalOperations.toLocaleString()}` },
            { type: 'mrkdwn', text: `*Success Rate:*\n${summary.successRate.toFixed(2)}%` },
            { type: 'mrkdwn', text: `*Errors:*\n${summary.errorCount}` },
            { type: 'mrkdwn', text: `*Date:*\n${new Date().toLocaleDateString()}` }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Top Services:*\n${summary.topServices.map(s => `• ${s.service}: ${s.operations} ops`).join('\n')}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Dashboard', emoji: true },
              url: `${process.env.APP_URL}/dashboard`
            }
          ]
        }
      ]
    })
  }
}

// Export singleton
export const slackAlerter = new SlackAlerter()

// Export helper function
export async function sendSlackAlert(
  type: AlertType,
  title: string,
  message: string,
  context?: AlertContext,
  channel?: string
): Promise<void> {
  switch (type) {
    case AlertType.CRITICAL:
      return slackAlerter.sendCriticalAlert(title, message, context, channel)
    case AlertType.ERROR:
      if (context?.service) {
        return slackAlerter.sendIntegrationFailure(
          context.service,
          message,
          context.errorCount || 1,
          context
        )
      }
      break
    case AlertType.SUCCESS:
      return slackAlerter.sendSuccessNotification(title, message, context)
  }

  // Default message
  return slackAlerter.sendMessage({
    channel,
    text: `${slackAlerter['getEmoji'](type)} ${title}: ${message}`
  })
}

export { SlackAlerter }
