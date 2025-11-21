/**
 * Validation Helper Functions
 *
 * Common validation utilities for integration testing
 */

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate URL format
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate JSON string
 */
export function validateJSON(jsonString: string): boolean {
  try {
    JSON.parse(jsonString)
    return true
  } catch {
    return false
  }
}

/**
 * Validate environment variables exist
 */
export function validateEnvironment(requiredVars: string[]): {
  valid: boolean
  missing: string[]
} {
  const missing = requiredVars.filter(varName => !process.env[varName])
  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * Validate HTTP status code is successful (2xx)
 */
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300
}

/**
 * Validate HTTP status code is client error (4xx)
 */
export function isClientError(status: number): boolean {
  return status >= 400 && status < 500
}

/**
 * Validate HTTP status code is server error (5xx)
 */
export function isServerError(status: number): boolean {
  return status >= 500 && status < 600
}

/**
 * Validate response contains required fields
 */
export function validateResponseFields(
  data: any,
  requiredFields: string[]
): {
  valid: boolean
  missing: string[]
} {
  const missing: string[] = []

  for (const field of requiredFields) {
    const fieldPath = field.split('.')
    let current = data

    for (const key of fieldPath) {
      if (current === null || current === undefined || !(key in current)) {
        missing.push(field)
        break
      }
      current = current[key]
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * Validate data type
 */
export function validateType(value: any, expectedType: string): boolean {
  switch (expectedType.toLowerCase()) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && !isNaN(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value)
    case 'array':
      return Array.isArray(value)
    case 'null':
      return value === null
    case 'undefined':
      return value === undefined
    default:
      return false
  }
}

/**
 * Validate array is not empty
 */
export function validateNotEmpty<T>(array: T[]): boolean {
  return Array.isArray(array) && array.length > 0
}

/**
 * Validate value is within range
 */
export function validateRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

/**
 * Validate string matches pattern
 */
export function validatePattern(value: string, pattern: RegExp): boolean {
  return pattern.test(value)
}

/**
 * Validate API response time is acceptable
 */
export function validateResponseTime(
  duration: number,
  acceptable: number = 2000
): {
  valid: boolean
  status: 'excellent' | 'good' | 'acceptable' | 'slow'
  message: string
} {
  if (duration < 500) {
    return { valid: true, status: 'excellent', message: `${duration}ms - Excellent` }
  } else if (duration < 1000) {
    return { valid: true, status: 'good', message: `${duration}ms - Good` }
  } else if (duration <= acceptable) {
    return { valid: true, status: 'acceptable', message: `${duration}ms - Acceptable` }
  } else {
    return { valid: false, status: 'slow', message: `${duration}ms - Too slow` }
  }
}

/**
 * Validate pagination response
 */
export function validatePaginationResponse(response: any): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!response.data && !response.results && !response.items) {
    errors.push('Response missing data array (checked: data, results, items)')
  }

  const dataArray = response.data || response.results || response.items
  if (dataArray && !Array.isArray(dataArray)) {
    errors.push('Data is not an array')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate ISO 8601 date format
 */
export function validateISO8601(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime()) && dateString === date.toISOString()
}

/**
 * Deep equality check for objects
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true

  if (obj1 === null || obj2 === null) return false
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (!keys2.includes(key)) return false
    if (!deepEqual(obj1[key], obj2[key])) return false
  }

  return true
}

// Export all validators
export default {
  validateEmail,
  validateURL,
  validateJSON,
  validateEnvironment,
  isSuccessStatus,
  isClientError,
  isServerError,
  validateResponseFields,
  validateType,
  validateNotEmpty,
  validateRange,
  validatePattern,
  validateResponseTime,
  validatePaginationResponse,
  validateUUID,
  validateISO8601,
  deepEqual
}
