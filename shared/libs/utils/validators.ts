/**
 * Data Validation Utilities
 *
 * Provides validation functions for common data types and business rules.
 *
 * Usage:
 * ```typescript
 * import { validateEmail, validatePhone, validateRequired } from '@/shared/libs/utils/validators'
 *
 * if (!validateEmail(email)) {
 *   throw new Error('Invalid email')
 * }
 * ```
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number (international format)
 */
export function validatePhone(phone: string): boolean {
  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')

  // Check if it's a valid international phone number
  const phoneRegex = /^\+?[1-9]\d{6,14}$/
  return phoneRegex.test(cleaned)
}

/**
 * Validate URL
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate required field
 */
export function validateRequired<T>(
  value: T | null | undefined,
  fieldName?: string
): T {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(
      `${fieldName || 'Field'} is required`,
      fieldName,
      value
    )
  }
  return value
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min?: number,
  max?: number,
  fieldName?: string
): boolean {
  const length = value.length

  if (min !== undefined && length < min) {
    throw new ValidationError(
      `${fieldName || 'Field'} must be at least ${min} characters`,
      fieldName,
      value
    )
  }

  if (max !== undefined && length > max) {
    throw new ValidationError(
      `${fieldName || 'Field'} must be at most ${max} characters`,
      fieldName,
      value
    )
  }

  return true
}

/**
 * Validate number range
 */
export function validateRange(
  value: number,
  min?: number,
  max?: number,
  fieldName?: string
): boolean {
  if (min !== undefined && value < min) {
    throw new ValidationError(
      `${fieldName || 'Field'} must be at least ${min}`,
      fieldName,
      value
    )
  }

  if (max !== undefined && value > max) {
    throw new ValidationError(
      `${fieldName || 'Field'} must be at most ${max}`,
      fieldName,
      value
    )
  }

  return true
}

/**
 * Validate enum value
 */
export function validateEnum<T>(
  value: T,
  allowedValues: T[],
  fieldName?: string
): boolean {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName || 'Field'} must be one of: ${allowedValues.join(', ')}`,
      fieldName,
      value
    )
  }
  return true
}

/**
 * Validate date format (ISO 8601)
 */
export function validateDate(date: string, fieldName?: string): boolean {
  const parsed = Date.parse(date)

  if (isNaN(parsed)) {
    throw new ValidationError(
      `${fieldName || 'Field'} must be a valid date`,
      fieldName,
      date
    )
  }

  return true
}

/**
 * Validate GUID/UUID
 */
export function validateGuid(guid: string, fieldName?: string): boolean {
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!guidRegex.test(guid)) {
    throw new ValidationError(
      `${fieldName || 'Field'} must be a valid GUID`,
      fieldName,
      guid
    )
  }

  return true
}

/**
 * Validate object has required fields
 */
export function validateObject<T extends object>(
  obj: T,
  requiredFields: (keyof T)[],
  objectName?: string
): T {
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      throw new ValidationError(
        `${objectName || 'Object'} is missing required field: ${String(field)}`,
        String(field)
      )
    }
  }

  return obj
}

/**
 * Sanitize string (remove potentially harmful characters)
 */
export function sanitizeString(value: string): string {
  return value
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/['"]/g, '') // Remove quotes
    .trim()
}

/**
 * Validate and sanitize email
 */
export function validateAndSanitizeEmail(email: string): string {
  const sanitized = email.toLowerCase().trim()

  if (!validateEmail(sanitized)) {
    throw new ValidationError('Invalid email address', 'email', email)
  }

  return sanitized
}

/**
 * Batch validate multiple rules
 */
export function validate(
  validations: Array<() => boolean | void>
): boolean {
  const errors: ValidationError[] = []

  for (const validation of validations) {
    try {
      validation()
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error)
      } else {
        throw error
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(
      `Validation failed: ${errors.map(e => e.message).join(', ')}`
    )
  }

  return true
}

/**
 * Create a validator function for a specific schema
 */
export function createValidator<T extends object>(
  schema: {
    [K in keyof T]?: (value: T[K]) => boolean | void
  }
): (data: T) => T {
  return (data: T) => {
    for (const [field, validator] of Object.entries(schema)) {
      if (validator && typeof validator === 'function') {
        const value = data[field as keyof T]
        validator(value)
      }
    }
    return data
  }
}

// Example usage:
/*
const validateContact = createValidator<{ email: string; phone: string }>({
  email: (value) => validateEmail(value),
  phone: (value) => validatePhone(value),
})

const contact = validateContact({ email: 'test@example.com', phone: '+1234567890' })
*/
