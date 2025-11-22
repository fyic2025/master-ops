import nodemailer from 'nodemailer'
import { logger } from '../logger'

/**
 * Email Alert Configuration
 */
export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  from: string
  to: string[]
}

/**
 * Email Alert Context
 */
export interface EmailAlertContext {
  businessId?: string
  businessSlug?: string
  service?: string
  environment?: string
  metadata?: Record<string, any>
}

/**
 * Email Alert Templates
 *
 * Provides pre-built email templates for common alerts.
 * Integrates with nodemailer for reliable email delivery.
 *
 * @example
 * ```typescript
 * import { emailAlerter } from './shared/libs/alerts/email-alerts'
 *
 * await emailAlerter.sendCriticalAlert(
 *   'Database Connection Failed',
 *   'Cannot connect to Supabase database',
 *   { service: 'supabase' }
 * )
 * ```
 */
export class EmailAlerter {
  private transporter: nodemailer.Transporter | null = null
  private config: EmailConfig | null = null
  private enabled: boolean = false

  constructor() {
    this.initialize()
  }

  /**
   * Initialize email configuration from environment variables
   */
  private initialize(): void {
    const host = process.env.EMAIL_HOST
    const port = process.env.EMAIL_PORT
    const user = process.env.EMAIL_USER
    const pass = process.env.EMAIL_PASS
    const from = process.env.EMAIL_FROM
    const to = process.env.EMAIL_TO

    if (!host || !port || !user || !pass || !from || !to) {
      logger.warn('Email alerts not configured - missing environment variables', {
        source: 'email-alerts',
        metadata: {
          required: ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM', 'EMAIL_TO']
        }
      })
      return
    }

    this.config = {
      host,
      port: parseInt(port, 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user, pass },
      from,
      to: to.split(',').map(email => email.trim())
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth
    })

    this.enabled = true
    logger.info('Email alerts initialized', {
      source: 'email-alerts',
      metadata: { to: this.config.to }
    })
  }

  /**
   * Send a critical alert email
   */
  async sendCriticalAlert(
    title: string,
    message: string,
    context?: EmailAlertContext,
    recipients?: string[]
  ): Promise<void> {
    const subject = `🚨 CRITICAL: ${title}`
    const html = this.buildCriticalAlertHtml(title, message, context)

    await this.sendEmail(subject, html, recipients)
  }

  /**
   * Send integration failure alert
   */
  async sendIntegrationFailure(
    service: string,
    errorMessage: string,
    errorCount: number,
    context?: EmailAlertContext,
    recipients?: string[]
  ): Promise<void> {
    const subject = `⚠️ Integration Failure: ${service}`
    const html = this.buildIntegrationFailureHtml(service, errorMessage, errorCount, context)

    await this.sendEmail(subject, html, recipients)
  }

  /**
   * Send workflow failure alert
   */
  async sendWorkflowFailure(
    workflowName: string,
    executionId: string,
    errorMessage: string,
    context?: EmailAlertContext,
    recipients?: string[]
  ): Promise<void> {
    const subject = `⚠️ Workflow Failed: ${workflowName}`
    const html = this.buildWorkflowFailureHtml(workflowName, executionId, errorMessage, context)

    await this.sendEmail(subject, html, recipients)
  }

  /**
   * Send performance degradation alert
   */
  async sendPerformanceAlert(
    service: string,
    avgDuration: number,
    threshold: number,
    context?: EmailAlertContext,
    recipients?: string[]
  ): Promise<void> {
    const subject = `⚠️ Performance Alert: ${service}`
    const html = this.buildPerformanceAlertHtml(service, avgDuration, threshold, context)

    await this.sendEmail(subject, html, recipients)
  }

  /**
   * Send daily summary report
   */
  async sendDailySummary(
    summary: {
      totalOperations: number
      successRate: number
      errorCount: number
      topServices: Array<{ service: string; count: number }>
      topErrors: Array<{ message: string; count: number }>
      healthStatus: Record<string, boolean>
    },
    context?: EmailAlertContext,
    recipients?: string[]
  ): Promise<void> {
    const subject = `📊 Daily Summary - ${new Date().toLocaleDateString()}`
    const html = this.buildDailySummaryHtml(summary, context)

    await this.sendEmail(subject, html, recipients)
  }

  /**
   * Send weekly analytics report
   */
  async sendWeeklyReport(
    report: {
      period: { start: Date; end: Date }
      totalOperations: number
      successRate: number
      errorCount: number
      serviceStats: Array<{ service: string; operations: number; errors: number; avgDuration: number }>
      businessStats: Array<{ business: string; operations: number; errors: number }>
      topErrors: Array<{ message: string; count: number; service: string }>
      improvements: string[]
      issues: string[]
    },
    context?: EmailAlertContext,
    recipients?: string[]
  ): Promise<void> {
    const subject = `📈 Weekly Report - ${report.period.start.toLocaleDateString()} to ${report.period.end.toLocaleDateString()}`
    const html = this.buildWeeklyReportHtml(report, context)

    await this.sendEmail(subject, html, recipients)
  }

  /**
   * Send generic alert email
   */
  async sendAlert(
    subject: string,
    message: string,
    context?: EmailAlertContext,
    recipients?: string[]
  ): Promise<void> {
    const html = this.buildGenericAlertHtml(subject, message, context)
    await this.sendEmail(subject, html, recipients)
  }

  /**
   * Core email sending function
   */
  private async sendEmail(
    subject: string,
    html: string,
    recipients?: string[]
  ): Promise<void> {
    if (!this.enabled || !this.transporter || !this.config) {
      logger.warn('Email not sent - alerts not configured', {
        source: 'email-alerts',
        metadata: { subject }
      })
      return
    }

    try {
      const to = recipients || this.config.to

      await this.transporter.sendMail({
        from: this.config.from,
        to: to.join(', '),
        subject,
        html
      })

      logger.info('Email sent successfully', {
        source: 'email-alerts',
        metadata: { subject, to }
      })
    } catch (error) {
      logger.error('Failed to send email', {
        source: 'email-alerts',
        metadata: { subject, error: error instanceof Error ? error.message : String(error) }
      }, error as Error)
    }
  }

  /**
   * Build HTML for critical alert
   */
  private buildCriticalAlertHtml(
    title: string,
    message: string,
    context?: EmailAlertContext
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc3545; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
    .alert-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc3545; }
    .metadata { background: #e9ecef; padding: 10px; margin: 10px 0; border-radius: 3px; }
    .footer { margin-top: 20px; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 CRITICAL ALERT</h1>
      <h2>${title}</h2>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong>Message:</strong>
        <p>${message}</p>
      </div>
      ${this.buildContextSection(context)}
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <div class="footer">
        <p>This is an automated alert from master-ops. Please investigate immediately.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Build HTML for integration failure
   */
  private buildIntegrationFailureHtml(
    service: string,
    errorMessage: string,
    errorCount: number,
    context?: EmailAlertContext
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #fd7e14; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
    .alert-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #fd7e14; }
    .metadata { background: #e9ecef; padding: 10px; margin: 10px 0; border-radius: 3px; }
    .footer { margin-top: 20px; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Integration Failure</h1>
      <h2>${service}</h2>
    </div>
    <div class="content">
      <div class="alert-box">
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Error Count:</strong> ${errorCount}</p>
        <p><strong>Error Message:</strong></p>
        <p>${errorMessage}</p>
      </div>
      ${this.buildContextSection(context)}
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <div class="footer">
        <p>Check logs: <code>ops logs --source=${service} --errors-only</code></p>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Build HTML for workflow failure
   */
  private buildWorkflowFailureHtml(
    workflowName: string,
    executionId: string,
    errorMessage: string,
    context?: EmailAlertContext
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #fd7e14; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
    .alert-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #fd7e14; }
    .metadata { background: #e9ecef; padding: 10px; margin: 10px 0; border-radius: 3px; }
    .footer { margin-top: 20px; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Workflow Failure</h1>
      <h2>${workflowName}</h2>
    </div>
    <div class="content">
      <div class="alert-box">
        <p><strong>Workflow:</strong> ${workflowName}</p>
        <p><strong>Execution ID:</strong> <code>${executionId}</code></p>
        <p><strong>Error:</strong></p>
        <p>${errorMessage}</p>
      </div>
      ${this.buildContextSection(context)}
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <div class="footer">
        <p>View details: <code>ops workflows --failures</code></p>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Build HTML for performance alert
   */
  private buildPerformanceAlertHtml(
    service: string,
    avgDuration: number,
    threshold: number,
    context?: EmailAlertContext
  ): string {
    const percentage = Math.round((avgDuration / threshold) * 100)

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ffc107; color: #333; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
    .alert-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #ffc107; }
    .metadata { background: #e9ecef; padding: 10px; margin: 10px 0; border-radius: 3px; }
    .footer { margin-top: 20px; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Performance Alert</h1>
      <h2>${service}</h2>
    </div>
    <div class="content">
      <div class="alert-box">
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Average Duration:</strong> ${avgDuration.toFixed(0)}ms</p>
        <p><strong>Threshold:</strong> ${threshold}ms</p>
        <p><strong>Performance:</strong> ${percentage}% of threshold</p>
      </div>
      ${this.buildContextSection(context)}
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <div class="footer">
        <p>Check performance: <code>ops stats --service=${service}</code></p>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Build HTML for daily summary
   */
  private buildDailySummaryHtml(
    summary: {
      totalOperations: number
      successRate: number
      errorCount: number
      topServices: Array<{ service: string; count: number }>
      topErrors: Array<{ message: string; count: number }>
      healthStatus: Record<string, boolean>
    },
    context?: EmailAlertContext
  ): string {
    const healthItems = Object.entries(summary.healthStatus)
      .map(([service, healthy]) => `
        <li>
          ${healthy ? '✅' : '❌'} ${service}
        </li>
      `)
      .join('')

    const topServicesItems = summary.topServices
      .slice(0, 5)
      .map(s => `<li>${s.service}: ${s.count} operations</li>`)
      .join('')

    const topErrorsItems = summary.topErrors
      .slice(0, 5)
      .map(e => `<li>${e.message} (${e.count} times)</li>`)
      .join('')

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0d6efd; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
    .section { background: white; padding: 15px; margin: 15px 0; border-radius: 3px; }
    .stats { display: flex; justify-content: space-around; margin: 20px 0; }
    .stat { text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #0d6efd; }
    .stat-label { font-size: 14px; color: #6c757d; }
    .footer { margin-top: 20px; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Daily Summary</h1>
      <h2>${new Date().toLocaleDateString()}</h2>
    </div>
    <div class="content">
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${summary.totalOperations}</div>
          <div class="stat-label">Total Operations</div>
        </div>
        <div class="stat">
          <div class="stat-value">${summary.successRate.toFixed(1)}%</div>
          <div class="stat-label">Success Rate</div>
        </div>
        <div class="stat">
          <div class="stat-value">${summary.errorCount}</div>
          <div class="stat-label">Errors</div>
        </div>
      </div>

      <div class="section">
        <h3>System Health</h3>
        <ul>${healthItems}</ul>
      </div>

      <div class="section">
        <h3>Top Services</h3>
        <ul>${topServicesItems}</ul>
      </div>

      ${summary.topErrors.length > 0 ? `
      <div class="section">
        <h3>Top Errors</h3>
        <ul>${topErrorsItems}</ul>
      </div>
      ` : ''}

      ${this.buildContextSection(context)}

      <div class="footer">
        <p>View full report: <code>ops stats</code></p>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Build HTML for weekly report
   */
  private buildWeeklyReportHtml(
    report: {
      period: { start: Date; end: Date }
      totalOperations: number
      successRate: number
      errorCount: number
      serviceStats: Array<{ service: string; operations: number; errors: number; avgDuration: number }>
      businessStats: Array<{ business: string; operations: number; errors: number }>
      topErrors: Array<{ message: string; count: number; service: string }>
      improvements: string[]
      issues: string[]
    },
    context?: EmailAlertContext
  ): string {
    const serviceStatsRows = report.serviceStats
      .slice(0, 10)
      .map(s => `
        <tr>
          <td>${s.service}</td>
          <td>${s.operations}</td>
          <td>${s.errors}</td>
          <td>${s.avgDuration.toFixed(0)}ms</td>
        </tr>
      `)
      .join('')

    const businessStatsRows = report.businessStats
      .map(b => `
        <tr>
          <td>${b.business}</td>
          <td>${b.operations}</td>
          <td>${b.errors}</td>
        </tr>
      `)
      .join('')

    const improvementsItems = report.improvements
      .map(i => `<li>${i}</li>`)
      .join('')

    const issuesItems = report.issues
      .map(i => `<li>${i}</li>`)
      .join('')

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: #198754; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
    .section { background: white; padding: 15px; margin: 15px 0; border-radius: 3px; }
    .stats { display: flex; justify-content: space-around; margin: 20px 0; }
    .stat { text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #198754; }
    .stat-label { font-size: 14px; color: #6c757d; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6; }
    th { background: #e9ecef; font-weight: bold; }
    .footer { margin-top: 20px; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📈 Weekly Report</h1>
      <h2>${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}</h2>
    </div>
    <div class="content">
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${report.totalOperations.toLocaleString()}</div>
          <div class="stat-label">Total Operations</div>
        </div>
        <div class="stat">
          <div class="stat-value">${report.successRate.toFixed(1)}%</div>
          <div class="stat-label">Success Rate</div>
        </div>
        <div class="stat">
          <div class="stat-value">${report.errorCount}</div>
          <div class="stat-label">Total Errors</div>
        </div>
      </div>

      <div class="section">
        <h3>Service Performance</h3>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Operations</th>
              <th>Errors</th>
              <th>Avg Duration</th>
            </tr>
          </thead>
          <tbody>
            ${serviceStatsRows}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>Business Activity</h3>
        <table>
          <thead>
            <tr>
              <th>Business</th>
              <th>Operations</th>
              <th>Errors</th>
            </tr>
          </thead>
          <tbody>
            ${businessStatsRows}
          </tbody>
        </table>
      </div>

      ${report.improvements.length > 0 ? `
      <div class="section">
        <h3>✅ Improvements</h3>
        <ul>${improvementsItems}</ul>
      </div>
      ` : ''}

      ${report.issues.length > 0 ? `
      <div class="section">
        <h3>⚠️ Issues to Address</h3>
        <ul>${issuesItems}</ul>
      </div>
      ` : ''}

      ${this.buildContextSection(context)}

      <div class="footer">
        <p>Generated by master-ops automated reporting</p>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Build HTML for generic alert
   */
  private buildGenericAlertHtml(
    subject: string,
    message: string,
    context?: EmailAlertContext
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6c757d; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
    .alert-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #6c757d; }
    .metadata { background: #e9ecef; padding: 10px; margin: 10px 0; border-radius: 3px; }
    .footer { margin-top: 20px; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${subject}</h1>
    </div>
    <div class="content">
      <div class="alert-box">
        <p>${message}</p>
      </div>
      ${this.buildContextSection(context)}
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <div class="footer">
        <p>This is an automated alert from master-ops.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Build context section HTML
   */
  private buildContextSection(context?: EmailAlertContext): string {
    if (!context) return ''

    const items: string[] = []

    if (context.businessId) items.push(`<p><strong>Business ID:</strong> ${context.businessId}</p>`)
    if (context.businessSlug) items.push(`<p><strong>Business:</strong> ${context.businessSlug}</p>`)
    if (context.service) items.push(`<p><strong>Service:</strong> ${context.service}</p>`)
    if (context.environment) items.push(`<p><strong>Environment:</strong> ${context.environment}</p>`)
    if (context.metadata) {
      items.push(`<p><strong>Metadata:</strong></p><pre>${JSON.stringify(context.metadata, null, 2)}</pre>`)
    }

    if (items.length === 0) return ''

    return `
      <div class="metadata">
        <h4>Context</h4>
        ${items.join('\n')}
      </div>
    `
  }
}

/**
 * Singleton instance
 */
export const emailAlerter = new EmailAlerter()
