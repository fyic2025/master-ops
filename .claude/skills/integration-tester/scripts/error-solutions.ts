/**
 * Error Solutions Database
 *
 * Common integration errors with causes and solutions
 */

export interface ErrorSolution {
  code: string
  message: string
  category: 'network' | 'authentication' | 'authorization' | 'validation' | 'server' | 'client' | 'rate-limit'
  causes: string[]
  solutions: string[]
  documentation?: string
}

export const ERROR_SOLUTIONS: Record<string, ErrorSolution> = {
  // Network Errors
  'ECONNREFUSED': {
    code: 'ECONNREFUSED',
    message: 'Connection refused',
    category: 'network',
    causes: [
      'Service is not running',
      'Wrong port number in BASE_URL',
      'Firewall blocking connection',
      'Service crashed or restarting'
    ],
    solutions: [
      'Verify service is running (check status)',
      'Confirm BASE_URL includes correct port',
      'Check firewall rules allow connection',
      'Wait for service to fully start',
      'Try: ping <hostname> to test connectivity'
    ]
  },

  'ETIMEDOUT': {
    code: 'ETIMEDOUT',
    message: 'Request timed out',
    category: 'network',
    causes: [
      'Service is overloaded or slow',
      'Network latency is high',
      'Timeout value is too low',
      'Service is processing large request'
    ],
    solutions: [
      'Increase timeout value in request config',
      'Check service health/performance metrics',
      'Verify network connection quality',
      'Try request again after waiting',
      'Consider implementing retry logic'
    ]
  },

  'ENOTFOUND': {
    code: 'ENOTFOUND',
    message: 'DNS lookup failed',
    category: 'network',
    causes: [
      'Hostname is incorrect or misspelled',
      'DNS server cannot resolve hostname',
      'No internet connection',
      'Hostname does not exist'
    ],
    solutions: [
      'Verify hostname spelling in BASE_URL',
      'Check DNS configuration',
      'Confirm internet connectivity',
      'Try: nslookup <hostname> to test DNS',
      'Use IP address instead of hostname for testing'
    ]
  },

  'ECONNRESET': {
    code: 'ECONNRESET',
    message: 'Connection reset by peer',
    category: 'network',
    causes: [
      'Server closed connection unexpectedly',
      'Network instability',
      'Request too large for server',
      'Server crashed during request'
    ],
    solutions: [
      'Retry the request',
      'Check server logs for errors',
      'Reduce request payload size',
      'Implement connection pooling',
      'Add retry logic with exponential backoff'
    ]
  },

  // HTTP 4xx Errors
  '400': {
    code: '400',
    message: 'Bad Request',
    category: 'validation',
    causes: [
      'Invalid request payload format',
      'Missing required fields',
      'Type validation failed',
      'Malformed JSON in request body'
    ],
    solutions: [
      'Validate request payload against API schema',
      'Check all required fields are present',
      'Verify data types match expectations',
      'Ensure JSON is properly formatted',
      'Review API documentation for request format'
    ]
  },

  '401': {
    code: '401',
    message: 'Unauthorized',
    category: 'authentication',
    causes: [
      'Missing authentication credentials',
      'Invalid API key or token',
      'Expired access token',
      'Incorrect Authorization header format'
    ],
    solutions: [
      'Verify API key/token is configured',
      'Check credentials are valid and not expired',
      'Regenerate API key/token if needed',
      'Confirm Authorization header format (e.g., "Bearer <token>")',
      'For OAuth: refresh access token'
    ]
  },

  '403': {
    code: '403',
    message: 'Forbidden',
    category: 'authorization',
    causes: [
      'Valid credentials but insufficient permissions',
      'Resource requires different access level',
      'IP address not whitelisted',
      'Account disabled or suspended',
      'HMAC signature verification failed'
    ],
    solutions: [
      'Review API scopes/permissions required',
      'Contact API provider for access rights',
      'Verify IP whitelist includes your IP',
      'Check account status is active',
      'For HMAC: verify signature calculation is correct'
    ]
  },

  '404': {
    code: '404',
    message: 'Not Found',
    category: 'client',
    causes: [
      'Resource does not exist',
      'Wrong endpoint URL',
      'Incorrect resource ID',
      'Resource was deleted'
    ],
    solutions: [
      'Verify endpoint path is correct',
      'Confirm resource ID exists',
      'Check API documentation for correct URL',
      'List available resources to find correct ID',
      'Ensure resource was not deleted'
    ]
  },

  '405': {
    code: '405',
    message: 'Method Not Allowed',
    category: 'client',
    causes: [
      'Using wrong HTTP method (GET instead of POST, etc.)',
      'Endpoint does not support this method',
      'API changed and method is deprecated'
    ],
    solutions: [
      'Check API documentation for correct HTTP method',
      'Verify endpoint supports your method (GET, POST, PUT, etc.)',
      'Try alternative HTTP methods',
      'Review API changelog for breaking changes'
    ]
  },

  '409': {
    code: '409',
    message: 'Conflict',
    category: 'validation',
    causes: [
      'Duplicate key or unique constraint violation',
      'Resource already exists',
      'Concurrent modification conflict',
      'State conflict (e.g., trying to delete active resource)'
    ],
    solutions: [
      'Use unique identifiers (UUIDs, timestamps)',
      'Check if resource already exists before creating',
      'Implement optimistic locking for updates',
      'Handle idempotency on client side',
      'Query for existing resource first'
    ]
  },

  '422': {
    code: '422',
    message: 'Unprocessable Entity',
    category: 'validation',
    causes: [
      'Validation failed on server',
      'Business logic constraints violated',
      'Field length/format requirements not met',
      'Related resource requirements not satisfied'
    ],
    solutions: [
      'Review validation error details in response',
      'Check field constraints (min/max length, format)',
      'Verify business rules are satisfied',
      'Ensure related resources exist',
      'Validate data against schema before sending'
    ]
  },

  '429': {
    code: '429',
    message: 'Too Many Requests',
    category: 'rate-limit',
    causes: [
      'Exceeded rate limit',
      'Too many concurrent requests',
      'Burst limit exceeded',
      'Account tier limits reached'
    ],
    solutions: [
      'Implement exponential backoff and retry',
      'Check Retry-After header for wait time',
      'Reduce request rate',
      'Implement request queuing/throttling',
      'Upgrade API plan for higher limits',
      'Cache responses to reduce requests'
    ]
  },

  // HTTP 5xx Errors
  '500': {
    code: '500',
    message: 'Internal Server Error',
    category: 'server',
    causes: [
      'Server-side bug or exception',
      'Database connection failed',
      'Unhandled exception in API code',
      'Service configuration error'
    ],
    solutions: [
      'Check service status page',
      'Retry request after delay',
      'Contact API support with error details',
      'Check service logs if you have access',
      'Implement retry logic for temporary failures'
    ]
  },

  '502': {
    code: '502',
    message: 'Bad Gateway',
    category: 'server',
    causes: [
      'Proxy/gateway received invalid response',
      'Upstream service is down',
      'Service is deploying/restarting',
      'Load balancer configuration issue'
    ],
    solutions: [
      'Wait for service deployment to complete',
      'Retry request after short delay',
      'Check service status page',
      'Try alternative endpoint if available',
      'Contact support if persistent'
    ]
  },

  '503': {
    code: '503',
    message: 'Service Unavailable',
    category: 'server',
    causes: [
      'Service is down for maintenance',
      'Server is overloaded',
      'Database is unavailable',
      'Scheduled downtime'
    ],
    solutions: [
      'Check service status page for maintenance window',
      'Implement retry with exponential backoff',
      'Wait for service to recover',
      'Check Retry-After header if present',
      'Subscribe to status notifications'
    ]
  },

  '504': {
    code: '504',
    message: 'Gateway Timeout',
    category: 'server',
    causes: [
      'Request took too long to process',
      'Upstream service not responding',
      'Database query timeout',
      'Heavy processing operation'
    ],
    solutions: [
      'Increase client timeout value',
      'Optimize query/request if possible',
      'Break large requests into smaller ones',
      'Use async processing for long operations',
      'Retry with exponential backoff'
    ]
  },

  // Authentication-specific errors
  'INVALID_TOKEN': {
    code: 'INVALID_TOKEN',
    message: 'Invalid authentication token',
    category: 'authentication',
    causes: [
      'Token format is incorrect',
      'Token has been revoked',
      'Token is corrupted',
      'Using test token in production'
    ],
    solutions: [
      'Generate new token',
      'Verify token format matches requirements',
      'Check environment variables are set correctly',
      'Ensure no whitespace in token string',
      'Use correct token for environment (dev/prod)'
    ]
  },

  'TOKEN_EXPIRED': {
    code: 'TOKEN_EXPIRED',
    message: 'Authentication token has expired',
    category: 'authentication',
    causes: [
      'Token exceeded its TTL',
      'Token was generated too long ago',
      'System clock skew'
    ],
    solutions: [
      'Regenerate fresh token',
      'Implement token refresh logic',
      'Use refresh token to get new access token',
      'Check system time is synchronized',
      'Store token expiration and refresh proactively'
    ]
  },

  'SIGNATURE_MISMATCH': {
    code: 'SIGNATURE_MISMATCH',
    message: 'HMAC signature verification failed',
    category: 'authentication',
    causes: [
      'Signature calculation is incorrect',
      'Using wrong secret key',
      'Signature string format mismatch',
      'Timestamp is out of acceptable window',
      'Encoding mismatch (base64 vs hex)'
    ],
    solutions: [
      'Verify signature string format matches API spec',
      'Confirm secret key is correct',
      'Check encoding format (base64/hex)',
      'Ensure timestamp is current',
      'Compare signature algorithm (SHA256 vs SHA512)',
      'Log signature string for debugging'
    ]
  }
}

/**
 * Get error solution by code or status
 */
export function getErrorSolution(errorCode: string | number): ErrorSolution | null {
  const key = String(errorCode)
  return ERROR_SOLUTIONS[key] || null
}

/**
 * Get error category
 */
export function getErrorCategory(statusCode: number): string {
  if (statusCode >= 400 && statusCode < 500) return 'client'
  if (statusCode >= 500) return 'server'
  if (statusCode === 429) return 'rate-limit'
  return 'unknown'
}

/**
 * Format error solution for display
 */
export function formatErrorSolution(solution: ErrorSolution): string {
  let output = `\n❌ ${solution.code}: ${solution.message}\n`
  output += `Category: ${solution.category}\n`

  output += `\nPossible Causes:\n`
  solution.causes.forEach((cause, i) => {
    output += `  ${i + 1}. ${cause}\n`
  })

  output += `\nSolutions:\n`
  solution.solutions.forEach((sol, i) => {
    output += `  ${i + 1}. ${sol}\n`
  })

  if (solution.documentation) {
    output += `\nDocumentation: ${solution.documentation}\n`
  }

  return output
}

/**
 * Analyze error and provide solution
 */
export function analyzeError(error: any): string {
  // Network errors
  if (error.code && ERROR_SOLUTIONS[error.code]) {
    return formatErrorSolution(ERROR_SOLUTIONS[error.code])
  }

  // HTTP status errors
  if (error.status && ERROR_SOLUTIONS[String(error.status)]) {
    return formatErrorSolution(ERROR_SOLUTIONS[String(error.status)])
  }

  // Try to match error message
  const errorMsg = error.message || String(error)

  if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
    return formatErrorSolution(ERROR_SOLUTIONS.ETIMEDOUT)
  }

  if (errorMsg.includes('ECONNREFUSED')) {
    return formatErrorSolution(ERROR_SOLUTIONS.ECONNREFUSED)
  }

  if (errorMsg.includes('ENOTFOUND')) {
    return formatErrorSolution(ERROR_SOLUTIONS.ENOTFOUND)
  }

  if (errorMsg.includes('signature') || errorMsg.includes('HMAC')) {
    return formatErrorSolution(ERROR_SOLUTIONS.SIGNATURE_MISMATCH)
  }

  if (errorMsg.includes('expired')) {
    return formatErrorSolution(ERROR_SOLUTIONS.TOKEN_EXPIRED)
  }

  // Generic error
  return `\n❌ Error: ${errorMsg}\n\nNo specific solution available. Check:\n  1. Service status and connectivity\n  2. Authentication credentials\n  3. Request format and parameters\n  4. API documentation\n`
}

// Export all
export default {
  ERROR_SOLUTIONS,
  getErrorSolution,
  getErrorCategory,
  formatErrorSolution,
  analyzeError
}
