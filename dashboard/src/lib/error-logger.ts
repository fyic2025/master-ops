import { supabase } from './supabase'

type ErrorLevel = 'error' | 'warn' | 'info'
type ErrorSource = 'frontend' | 'api' | 'network' | 'supabase'

interface ErrorDetails {
  stack?: string
  code?: string
  status?: number
  endpoint?: string
  component?: string
  [key: string]: unknown
}

/**
 * Log errors to Supabase for monitoring
 */
export async function logError(
  source: ErrorSource,
  level: ErrorLevel,
  message: string,
  details?: ErrorDetails
): Promise<void> {
  try {
    const { error } = await supabase.from('dashboard_error_logs').insert({
      source,
      level,
      message,
      details,
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    })

    if (error) {
      // Don't throw - just log to console as fallback
      console.error('[ErrorLogger] Failed to log error:', error)
    }
  } catch (e) {
    console.error('[ErrorLogger] Exception:', e)
  }
}

/**
 * Convenience methods
 */
export const errorLogger = {
  error: (source: ErrorSource, message: string, details?: ErrorDetails) =>
    logError(source, 'error', message, details),

  warn: (source: ErrorSource, message: string, details?: ErrorDetails) =>
    logError(source, 'warn', message, details),

  info: (source: ErrorSource, message: string, details?: ErrorDetails) =>
    logError(source, 'info', message, details),

  // Capture unhandled errors
  captureException: (error: Error, context?: { source?: ErrorSource; component?: string }) => {
    const source = context?.source || 'frontend'
    return logError(source, 'error', error.message, {
      stack: error.stack,
      name: error.name,
      component: context?.component,
    })
  },

  // Capture API/fetch errors
  captureApiError: (endpoint: string, status: number, message: string) => {
    return logError('api', 'error', message, {
      endpoint,
      status,
    })
  },

  // Capture Supabase errors
  captureSupabaseError: (operation: string, error: { code?: string; message: string }) => {
    return logError('supabase', 'error', error.message, {
      operation,
      code: error.code,
    })
  },
}

/**
 * Setup global error handlers (call once in app initialization)
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return

  // Unhandled JS errors
  window.onerror = (message, source, lineno, colno, error) => {
    logError('frontend', 'error', String(message), {
      source: String(source),
      lineno,
      colno,
      stack: error?.stack,
    })
    return false // Don't prevent default handling
  }

  // Unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const error = event.reason
    logError('frontend', 'error', error?.message || 'Unhandled promise rejection', {
      stack: error?.stack,
      type: 'unhandledrejection',
    })
  }

  console.log('[ErrorLogger] Global error handlers initialized')
}
