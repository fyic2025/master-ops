/**
 * Base Connector
 *
 * Abstract base class for all integration connectors.
 * Provides common functionality: rate limiting, retry logic, error handling, logging.
 *
 * Usage:
 * ```typescript
 * class HubSpotConnector extends BaseConnector {
 *   constructor() {
 *     super('hubspot', {
 *       rateLimiter: { maxRequests: 100, windowMs: 10000 },
 *       retry: { maxRetries: 3 }
 *     })
 *   }
 *
 *   async getContact(id: string) {
 *     return this.execute('getContact', async () => {
 *       // API call implementation
 *     })
 *   }
 * }
 * ```
 */

import { logger, LogContext } from '../../logger'
import { RateLimiter, RateLimiterConfig } from './rate-limiter'
import { RetryHandler, RetryConfig } from './retry-handler'
import { ErrorHandler, IntegrationError } from './error-handler'

export interface BaseConnectorConfig {
  rateLimiter?: RateLimiterConfig | false // false to disable
  retry?: RetryConfig | false // false to disable
  timeout?: number // Request timeout in ms
  enableLogging?: boolean // Enable/disable logging (default: true)
  metadata?: Record<string, any> // Additional metadata for logging
}

export abstract class BaseConnector {
  protected readonly serviceName: string
  protected readonly rateLimiter?: RateLimiter
  protected readonly retryHandler?: RetryHandler
  protected readonly timeout?: number
  protected readonly enableLogging: boolean
  protected readonly metadata: Record<string, any>

  constructor(serviceName: string, config: BaseConnectorConfig = {}) {
    this.serviceName = serviceName
    this.enableLogging = config.enableLogging ?? true
    this.timeout = config.timeout
    this.metadata = config.metadata || {}

    // Initialize rate limiter
    if (config.rateLimiter !== false) {
      this.rateLimiter = new RateLimiter(
        config.rateLimiter || {
          maxRequests: 100,
          windowMs: 60000, // 100 requests per minute by default
        }
      )
    }

    // Initialize retry handler
    if (config.retry !== false) {
      this.retryHandler = new RetryHandler(config.retry || {})
    }

    if (this.enableLogging) {
      logger.info(`${serviceName} connector initialized`, {
        source: serviceName as any,
        metadata: {
          rateLimiting: !!this.rateLimiter,
          retryEnabled: !!this.retryHandler,
          timeout: this.timeout,
        },
      })
    }
  }

  /**
   * Execute an operation with rate limiting, retry, and error handling
   */
  protected async execute<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const logContext: LogContext = {
      source: this.serviceName as any,
      operation,
      ...this.metadata,
      ...context,
    }

    const startTime = Date.now()

    try {
      // Apply rate limiting
      if (this.rateLimiter) {
        await this.rateLimiter.acquire()
      }

      // Execute with retry logic
      const executeWithTimeout = async () => {
        if (this.timeout) {
          return this.withTimeout(fn(), this.timeout)
        }
        return fn()
      }

      let result: T

      if (this.retryHandler) {
        result = await this.retryHandler.execute(executeWithTimeout, {
          operation,
          source: this.serviceName,
        })
      } else {
        result = await executeWithTimeout()
      }

      const duration = Date.now() - startTime

      if (this.enableLogging) {
        logger.info(`${operation} completed successfully`, {
          ...logContext,
          duration,
          metadata: {
            ...logContext.metadata,
            success: true,
          },
        })
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      // Wrap and handle error
      const integrationError = ErrorHandler.wrap(error as Error, {
        service: this.serviceName,
        operation,
        details: {
          duration,
          ...logContext.metadata,
        },
      })

      if (this.enableLogging) {
        logger.error(`${operation} failed`, {
          ...logContext,
          duration,
          metadata: {
            ...logContext.metadata,
            success: false,
            errorCode: integrationError.code,
            errorCategory: integrationError.category,
          },
        }, integrationError)
      }

      throw integrationError
    }
  }

  /**
   * Execute with custom timeout
   */
  protected async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(ErrorHandler.timeout(`Operation timed out after ${timeoutMs}ms`, {
          service: this.serviceName,
        })), timeoutMs)
      ),
    ])
  }

  /**
   * Batch execute multiple operations in parallel with concurrency limit
   */
  protected async batchExecute<T, R>(
    items: T[],
    operation: string,
    fn: (item: T) => Promise<R>,
    options: {
      concurrency?: number
      continueOnError?: boolean
      context?: LogContext
    } = {}
  ): Promise<Array<{ item: T; result?: R; error?: IntegrationError }>> {
    const concurrency = options.concurrency || 5
    const continueOnError = options.continueOnError ?? true
    const results: Array<{ item: T; result?: R; error?: IntegrationError }> = []

    // Process in chunks
    for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency)

      const chunkResults = await Promise.all(
        chunk.map(async item => {
          try {
            const result = await this.execute(
              operation,
              () => fn(item),
              options.context
            )
            return { item, result }
          } catch (error) {
            const integrationError = error as IntegrationError
            if (!continueOnError) {
              throw integrationError
            }
            return { item, error: integrationError }
          }
        })
      )

      results.push(...chunkResults)
    }

    return results
  }

  /**
   * Get service health status
   */
  async healthCheck(): Promise<{
    service: string
    healthy: boolean
    timestamp: Date
    details?: Record<string, any>
  }> {
    try {
      await this.performHealthCheck()

      return {
        service: this.serviceName,
        healthy: true,
        timestamp: new Date(),
        details: {
          rateLimiterTokens: this.rateLimiter?.getAvailableTokens(),
        },
      }
    } catch (error) {
      return {
        service: this.serviceName,
        healthy: false,
        timestamp: new Date(),
        details: {
          error: (error as Error).message,
        },
      }
    }
  }

  /**
   * Abstract method for service-specific health check
   * Override in subclass
   */
  protected abstract performHealthCheck(): Promise<void>

  /**
   * Get connector metrics
   */
  getMetrics() {
    return {
      service: this.serviceName,
      rateLimiter: {
        enabled: !!this.rateLimiter,
        availableTokens: this.rateLimiter?.getAvailableTokens(),
      },
      retry: {
        enabled: !!this.retryHandler,
      },
      timeout: this.timeout,
    }
  }
}
