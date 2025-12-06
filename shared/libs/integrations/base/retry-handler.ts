/**
 * Retry Handler
 *
 * Implements exponential backoff retry logic for failed API calls.
 * Handles transient errors and rate limit errors automatically.
 *
 * Usage:
 * ```typescript
 * const retry = new RetryHandler({ maxRetries: 3 })
 * const result = await retry.execute(() => apiCall())
 * ```
 */

import { logger, type LogContext } from '../../logger'

export interface RetryConfig {
  maxRetries?: number // Maximum number of retry attempts (default: 3)
  initialDelay?: number // Initial delay in ms (default: 1000)
  maxDelay?: number // Maximum delay in ms (default: 30000)
  backoffMultiplier?: number // Backoff multiplier (default: 2)
  retryableStatusCodes?: number[] // HTTP status codes to retry (default: [408, 429, 500, 502, 503, 504])
  retryableErrors?: string[] // Error messages to retry (case-insensitive substring match)
}

export interface RetryContext {
  attempt: number
  maxRetries: number
  error: Error
  delay: number
}

export class RetryHandler {
  private config: Required<RetryConfig>

  constructor(config: RetryConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      initialDelay: config.initialDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      retryableStatusCodes: config.retryableStatusCodes ?? [408, 429, 500, 502, 503, 504],
      retryableErrors: config.retryableErrors ?? [
        'ECONNRESET',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'ENOTFOUND',
        'timeout',
        'network',
        'rate limit',
      ],
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryable(error: any): boolean {
    // Check HTTP status code
    if (error.response?.status && this.config.retryableStatusCodes.includes(error.response.status)) {
      return true
    }

    if (error.status && this.config.retryableStatusCodes.includes(error.status)) {
      return true
    }

    // Check error message
    const errorMessage = error.message?.toLowerCase() || ''
    const errorCode = error.code?.toLowerCase() || ''

    return this.config.retryableErrors.some(
      retryable =>
        errorMessage.includes(retryable.toLowerCase()) || errorCode.includes(retryable.toLowerCase())
    )
  }

  /**
   * Calculate delay for next retry using exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1)
    const jitter = Math.random() * 0.1 * exponentialDelay // Add 0-10% jitter
    return Math.min(exponentialDelay + jitter, this.config.maxDelay)
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    context?: { operation?: string; source?: string }
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        // Don't retry if max retries reached
        if (attempt > this.config.maxRetries) {
          logger.error('Max retries exceeded', {
            ...context,
            metadata: {
              attempt,
              maxRetries: this.config.maxRetries,
              error: lastError.message,
            },
          } as LogContext, lastError)
          throw lastError
        }

        // Don't retry if error is not retryable
        if (!this.isRetryable(error)) {
          logger.error('Non-retryable error encountered', {
            ...context,
            metadata: {
              attempt,
              error: lastError.message,
            },
          } as LogContext, lastError)
          throw lastError
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt)

        logger.warn('Retrying after error', {
          ...context,
          metadata: {
            attempt,
            maxRetries: this.config.maxRetries,
            delay,
            error: lastError.message,
          },
        } as LogContext)

        await this.sleep(delay)
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError!
  }

  /**
   * Execute with custom retry condition
   */
  async executeWithCondition<T>(
    fn: () => Promise<T>,
    shouldRetry: (error: Error, attempt: number) => boolean,
    context?: { operation?: string; source?: string }
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        // Don't retry if max retries reached
        if (attempt > this.config.maxRetries) {
          throw lastError
        }

        // Check custom retry condition
        if (!shouldRetry(lastError, attempt)) {
          throw lastError
        }

        // Wait before retry
        const delay = this.calculateDelay(attempt)
        logger.warn('Retrying with custom condition', {
          ...context,
          metadata: { attempt, delay },
        } as LogContext)
        await this.sleep(delay)
      }
    }

    throw lastError!
  }
}
