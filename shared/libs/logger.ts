/**
 * Centralized Logging Library
 *
 * Provides consistent logging across all master-ops services with support for:
 * - Multiple log levels (debug, info, warn, error)
 * - Supabase persistence for integration logs
 * - Structured logging with context
 * - Performance monitoring
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/shared/libs/logger'
 *
 * logger.info('Operation completed', { userId: 123 })
 * logger.error('Failed to sync', { error, context: 'hubspot-sync' })
 * ```
 */

import { serviceClient } from '../../infra/supabase/client'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogSource = 'hubspot' | 'unleashed' | 'n8n' | 'supabase' | 'system' | 'workflow' | 'integration' | 'cli' | 'backup' | 'restore' | 'performance-monitor' | 'example' | 'xero' | 'email-alerts' | 'business-automation' | 'workflow-automation'

export interface LogContext {
  source?: LogSource
  service?: string
  operation?: string
  userId?: string
  businessId?: string
  workflowId?: string
  integrationId?: string
  duration?: number
  metadata?: Record<string, any>
  [key: string]: any
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: LogContext
  error?: Error
}

class Logger {
  private persistToSupabase: boolean = true
  private minLevel: LogLevel = 'info'

  constructor() {
    // Check if Supabase service client is available
    this.persistToSupabase = !!serviceClient

    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL as LogLevel
    if (envLevel && ['debug', 'info', 'warn', 'error'].includes(envLevel)) {
      this.minLevel = envLevel
    }
  }

  /**
   * Check if a log level should be logged based on minimum level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(level)
    const minLevelIndex = levels.indexOf(this.minLevel)
    return currentLevelIndex >= minLevelIndex
  }

  /**
   * Format log entry for console output
   */
  private formatConsoleLog(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const level = entry.level.toUpperCase().padEnd(5)
    const context = entry.context
      ? ` [${entry.context.source || 'system'}${entry.context.operation ? `:${entry.context.operation}` : ''}]`
      : ''
    const metadata = entry.context?.metadata ? ` ${JSON.stringify(entry.context.metadata)}` : ''
    const error = entry.error ? `\n  Error: ${entry.error.message}\n  Stack: ${entry.error.stack}` : ''

    return `${timestamp} ${level}${context} ${entry.message}${metadata}${error}`
  }

  /**
   * Persist log entry to Supabase
   */
  private async persistLog(entry: LogEntry): Promise<void> {
    if (!this.persistToSupabase || !serviceClient) {
      return
    }

    try {
      const status = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warning' : entry.level === 'info' ? 'info' : 'info'

      await serviceClient.from('integration_logs').insert({
        source: entry.context?.source || 'system',
        service: entry.context?.service,
        operation: entry.context?.operation,
        level: entry.level,
        status,
        message: entry.message,
        details_json: {
          ...entry.context,
          error: entry.error
            ? {
                message: entry.error.message,
                stack: entry.error.stack,
                name: entry.error.name,
              }
            : undefined,
        },
        user_id: entry.context?.userId,
        business_id: entry.context?.businessId,
        workflow_id: entry.context?.workflowId,
        integration_id: entry.context?.integrationId,
        duration_ms: entry.context?.duration,
      })
    } catch (error) {
      // Don't fail the application if logging fails
      console.error('Failed to persist log to Supabase:', error)
    }
  }

  /**
   * Core logging method
   */
  private async log(level: LogLevel, message: string, context?: LogContext, error?: Error): Promise<void> {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
    }

    // Console output
    const formattedLog = this.formatConsoleLog(entry)

    switch (level) {
      case 'debug':
        console.debug(formattedLog)
        break
      case 'info':
        console.info(formattedLog)
        break
      case 'warn':
        console.warn(formattedLog)
        break
      case 'error':
        console.error(formattedLog)
        break
    }

    // Persist to Supabase (async, don't await to avoid blocking)
    this.persistLog(entry).catch(() => {
      // Already handled in persistLog
    })
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error)
  }

  /**
   * Log performance metric
   */
  async perf(operation: string, fn: () => Promise<any>, context?: LogContext): Promise<any> {
    const startTime = Date.now()

    try {
      const result = await fn()
      const duration = Date.now() - startTime

      await this.log('info', `${operation} completed`, {
        ...context,
        operation,
        duration,
        metadata: { success: true },
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      await this.log('error', `${operation} failed`, {
        ...context,
        operation,
        duration,
        metadata: { success: false },
      }, error as Error)

      throw error
    }
  }

  /**
   * Create a child logger with default context
   */
  child(defaultContext: LogContext): Logger {
    const childLogger = new Logger()

    // Override logging methods to include default context
    const originalLog = childLogger.log.bind(childLogger)
    childLogger.log = async (level: LogLevel, message: string, context?: LogContext, error?: Error) => {
      return originalLog(level, message, { ...defaultContext, ...context }, error)
    }

    return childLogger
  }

  /**
   * Disable Supabase persistence
   */
  disablePersistence(): void {
    this.persistToSupabase = false
  }

  /**
   * Enable Supabase persistence
   */
  enablePersistence(): void {
    this.persistToSupabase = !!serviceClient
  }
}

// Export singleton instance
export const logger = new Logger()

// Export class for testing and custom instances
export { Logger }
