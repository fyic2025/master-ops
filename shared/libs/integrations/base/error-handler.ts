/**
 * Error Handler
 *
 * Standardizes error handling across all integrations.
 * Provides consistent error formatting, categorization, and logging.
 *
 * Usage:
 * ```typescript
 * throw new IntegrationError('Failed to fetch data', {
 *   code: 'FETCH_FAILED',
 *   statusCode: 500,
 *   service: 'hubspot'
 * })
 * ```
 */

import { logger } from '../../logger'

export type ErrorCategory =
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'CONFLICT_ERROR'
  | 'SERVER_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR'

export interface IntegrationErrorContext {
  code?: string
  statusCode?: number
  service?: string
  operation?: string
  category?: ErrorCategory
  retryable?: boolean
  details?: Record<string, any>
  originalError?: Error
}

export class IntegrationError extends Error {
  public readonly code: string
  public readonly statusCode?: number
  public readonly service?: string
  public readonly operation?: string
  public readonly category: ErrorCategory
  public readonly retryable: boolean
  public readonly details?: Record<string, any>
  public readonly originalError?: Error
  public readonly timestamp: Date

  constructor(message: string, context: IntegrationErrorContext = {}) {
    super(message)
    this.name = 'IntegrationError'
    this.code = context.code || 'INTEGRATION_ERROR'
    this.statusCode = context.statusCode
    this.service = context.service
    this.operation = context.operation
    this.category = context.category || this.categorizeError(context)
    this.retryable = context.retryable ?? this.isRetryableByDefault(this.category)
    this.details = context.details
    this.originalError = context.originalError
    this.timestamp = new Date()

    // Maintain proper stack trace
    Error.captureStackTrace(this, IntegrationError)
  }

  /**
   * Categorize error based on context
   */
  private categorizeError(context: IntegrationErrorContext): ErrorCategory {
    const statusCode = context.statusCode

    if (statusCode) {
      if (statusCode === 401) return 'AUTHENTICATION_ERROR'
      if (statusCode === 403) return 'AUTHORIZATION_ERROR'
      if (statusCode === 404) return 'NOT_FOUND_ERROR'
      if (statusCode === 409) return 'CONFLICT_ERROR'
      if (statusCode === 429) return 'RATE_LIMIT_ERROR'
      if (statusCode === 408 || statusCode === 504) return 'TIMEOUT_ERROR'
      if (statusCode >= 500) return 'SERVER_ERROR'
      if (statusCode >= 400) return 'VALIDATION_ERROR'
    }

    if (context.originalError) {
      const errorCode = (context.originalError as any).code
      if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ECONNRESET') {
        return 'NETWORK_ERROR'
      }
      if (errorCode === 'ETIMEDOUT') {
        return 'TIMEOUT_ERROR'
      }
    }

    return 'UNKNOWN_ERROR'
  }

  /**
   * Determine if error is retryable by default based on category
   */
  private isRetryableByDefault(category: ErrorCategory): boolean {
    return [
      'NETWORK_ERROR',
      'RATE_LIMIT_ERROR',
      'TIMEOUT_ERROR',
      'SERVER_ERROR',
    ].includes(category)
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      service: this.service,
      operation: this.operation,
      category: this.category,
      retryable: this.retryable,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    }
  }
}

/**
 * Error Handler utility class
 */
export class ErrorHandler {
  /**
   * Wrap an error in IntegrationError if it isn't already
   */
  static wrap(error: any, context: IntegrationErrorContext = {}): IntegrationError {
    if (error instanceof IntegrationError) {
      return error
    }

    return new IntegrationError(
      error.message || 'Unknown error occurred',
      {
        ...context,
        originalError: error,
        statusCode: context.statusCode || error.response?.status || error.status,
        details: {
          ...context.details,
          originalName: error.name,
          originalCode: error.code,
        },
      }
    )
  }

  /**
   * Handle and log an error
   */
  static handle(error: any, context: IntegrationErrorContext = {}): IntegrationError {
    const integrationError = this.wrap(error, context)

    logger.error(integrationError.message, {
      source: integrationError.service as any,
      operation: integrationError.operation,
      metadata: {
        code: integrationError.code,
        category: integrationError.category,
        retryable: integrationError.retryable,
        statusCode: integrationError.statusCode,
        details: integrationError.details,
      },
    }, integrationError)

    return integrationError
  }

  /**
   * Create a specific error type
   */
  static authentication(message: string, context: Omit<IntegrationErrorContext, 'category'> = {}): IntegrationError {
    return new IntegrationError(message, {
      ...context,
      category: 'AUTHENTICATION_ERROR',
      code: context.code || 'AUTH_FAILED',
      retryable: false,
    })
  }

  static authorization(message: string, context: Omit<IntegrationErrorContext, 'category'> = {}): IntegrationError {
    return new IntegrationError(message, {
      ...context,
      category: 'AUTHORIZATION_ERROR',
      code: context.code || 'FORBIDDEN',
      retryable: false,
    })
  }

  static rateLimit(message: string, context: Omit<IntegrationErrorContext, 'category'> = {}): IntegrationError {
    return new IntegrationError(message, {
      ...context,
      category: 'RATE_LIMIT_ERROR',
      code: context.code || 'RATE_LIMIT_EXCEEDED',
      retryable: true,
    })
  }

  static validation(message: string, context: Omit<IntegrationErrorContext, 'category'> = {}): IntegrationError {
    return new IntegrationError(message, {
      ...context,
      category: 'VALIDATION_ERROR',
      code: context.code || 'VALIDATION_FAILED',
      retryable: false,
    })
  }

  static notFound(message: string, context: Omit<IntegrationErrorContext, 'category'> = {}): IntegrationError {
    return new IntegrationError(message, {
      ...context,
      category: 'NOT_FOUND_ERROR',
      code: context.code || 'NOT_FOUND',
      retryable: false,
    })
  }

  static network(message: string, context: Omit<IntegrationErrorContext, 'category'> = {}): IntegrationError {
    return new IntegrationError(message, {
      ...context,
      category: 'NETWORK_ERROR',
      code: context.code || 'NETWORK_ERROR',
      retryable: true,
    })
  }

  static timeout(message: string, context: Omit<IntegrationErrorContext, 'category'> = {}): IntegrationError {
    return new IntegrationError(message, {
      ...context,
      category: 'TIMEOUT_ERROR',
      code: context.code || 'TIMEOUT',
      retryable: true,
    })
  }

  static api(message: string, context: Omit<IntegrationErrorContext, 'category'> = {}): IntegrationError {
    return new IntegrationError(message, {
      ...context,
      category: context.statusCode && context.statusCode >= 500 ? 'SERVER_ERROR' : 'VALIDATION_ERROR',
      code: context.code || 'API_ERROR',
      retryable: context.statusCode ? context.statusCode >= 500 : false,
    })
  }

  static auth(message: string, context: Omit<IntegrationErrorContext, 'category'> = {}): IntegrationError {
    return ErrorHandler.authentication(message, context)
  }

  static connection(message: string, context: Omit<IntegrationErrorContext, 'category'> = {}): IntegrationError {
    return ErrorHandler.network(message, context)
  }

  static config(message: string, context: Omit<IntegrationErrorContext, 'category'> = {}): IntegrationError {
    return new IntegrationError(message, {
      ...context,
      category: 'VALIDATION_ERROR',
      code: context.code || 'CONFIG_ERROR',
      retryable: false,
    })
  }

  static serviceUnavailable(message: string, context: Omit<IntegrationErrorContext, 'category'> = {}): IntegrationError {
    return new IntegrationError(message, {
      ...context,
      category: 'SERVER_ERROR',
      code: context.code || 'SERVICE_UNAVAILABLE',
      retryable: true,
    })
  }
}
