/**
 * Data Transformation Utilities
 *
 * Common data transformations for syncing between systems.
 *
 * Usage:
 * ```typescript
 * import { transformHubSpotToSupabase, mapFields } from '@/shared/libs/utils/data-transformers'
 *
 * const supabaseData = transformHubSpotToSupabase(hubspotContact)
 * ```
 */

export interface FieldMapping {
  source: string
  target: string
  transform?: (value: any) => any
  default?: any
}

/**
 * Generic field mapper
 */
export function mapFields<T = any>(
  source: any,
  mappings: FieldMapping[]
): T {
  const result: any = {}

  for (const mapping of mappings) {
    let value = getNestedValue(source, mapping.source)

    if (value === undefined || value === null) {
      value = mapping.default
    }

    if (value !== undefined && mapping.transform) {
      value = mapping.transform(value)
    }

    if (value !== undefined) {
      setNestedValue(result, mapping.target, value)
    }
  }

  return result as T
}

/**
 * Get nested property value
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj)
}

/**
 * Set nested property value
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.')
  const last = parts.pop()!
  const target = parts.reduce((current, prop) => {
    if (!current[prop]) current[prop] = {}
    return current[prop]
  }, obj)
  target[last] = value
}

/**
 * Transform HubSpot contact to Supabase format
 */
export function transformHubSpotToSupabase(hubspotContact: any) {
  return mapFields(hubspotContact, [
    { source: 'id', target: 'hubspot_id' },
    { source: 'properties.email', target: 'email' },
    { source: 'properties.firstname', target: 'first_name' },
    { source: 'properties.lastname', target: 'last_name' },
    { source: 'properties.phone', target: 'phone' },
    { source: 'properties.company', target: 'company_name' },
    { source: 'createdAt', target: 'created_at', transform: (v) => new Date(v).toISOString() },
    { source: 'updatedAt', target: 'updated_at', transform: (v) => new Date(v).toISOString() },
  ])
}

/**
 * Transform Supabase to HubSpot format
 */
export function transformSupabaseToHubSpot(supabaseRecord: any) {
  return {
    properties: {
      email: supabaseRecord.email,
      firstname: supabaseRecord.first_name,
      lastname: supabaseRecord.last_name,
      phone: supabaseRecord.phone,
      company: supabaseRecord.company_name,
    }
  }
}

/**
 * Transform Unleashed customer to Supabase
 */
export function transformUnleashedToSupabase(unleashedCustomer: any) {
  return mapFields(unleashedCustomer, [
    { source: 'Guid', target: 'unleashed_id' },
    { source: 'CustomerCode', target: 'customer_code' },
    { source: 'CustomerName', target: 'company_name' },
    { source: 'Email', target: 'email' },
    { source: 'PhysicalAddress.AddressLine1', target: 'address_line1' },
    { source: 'PhysicalAddress.City', target: 'city' },
    { source: 'PhysicalAddress.PostalCode', target: 'postal_code' },
    { source: 'PhysicalAddress.Country', target: 'country' },
  ])
}

/**
 * Normalize phone number
 */
export function normalizePhone(phone: string): string {
  // Remove all non-numeric except +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // Add + if missing and looks international
  if (!cleaned.startsWith('+') && cleaned.length > 10) {
    cleaned = '+' + cleaned
  }

  return cleaned
}

/**
 * Normalize email
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

/**
 * Parse full name into first/last
 */
export function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  }
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

/**
 * Parse date from various formats
 */
export function parseDate(dateString: string): Date {
  // Try ISO format first
  const iso = Date.parse(dateString)
  if (!isNaN(iso)) return new Date(iso)

  // Try common formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,  // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/,  // DD-MM-YYYY
  ]

  for (const format of formats) {
    const match = dateString.match(format)
    if (match) {
      return new Date(dateString)
    }
  }

  throw new Error(`Unable to parse date: ${dateString}`)
}

/**
 * Flatten nested object
 */
export function flattenObject(obj: any, prefix: string = ''): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(result, flattenObject(value, newKey))
    } else {
      result[newKey] = value
    }
  }

  return result
}

/**
 * Unflatten object
 */
export function unflattenObject(obj: Record<string, any>): any {
  const result: any = {}

  for (const [key, value] of Object.entries(obj)) {
    setNestedValue(result, key, value)
  }

  return result
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Remove null/undefined values
 */
export function removeEmpty(obj: any): any {
  const result: any = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleaned = removeEmpty(value)
        if (Object.keys(cleaned).length > 0) {
          result[key] = cleaned
        }
      } else {
        result[key] = value
      }
    }
  }

  return result
}

/**
 * Batch transform array of objects
 */
export function batchTransform<S, T>(
  items: S[],
  transformer: (item: S) => T
): T[] {
  return items.map(transformer)
}

/**
 * Transform with validation
 */
export function transformWithValidation<S, T>(
  item: S,
  transformer: (item: S) => T,
  validator: (result: T) => boolean
): T {
  const result = transformer(item)

  if (!validator(result)) {
    throw new Error('Transformation validation failed')
  }

  return result
}

/**
 * Merge objects with priority
 */
export function mergeWithPriority<T extends object>(
  base: T,
  override: Partial<T>,
  priorities: Array<keyof T> = []
): T {
  const result = { ...base, ...override }

  // Priority fields always use override value even if undefined
  for (const field of priorities) {
    if (field in override) {
      result[field] = override[field] as any
    }
  }

  return result
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Convert object keys snake_case to camelCase
 */
export function objectKeysToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(objectKeysToCamel)
  }

  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = snakeToCamel(key)
      result[camelKey] = objectKeysToCamel(obj[key])
      return result
    }, {} as any)
  }

  return obj
}

/**
 * Convert object keys camelCase to snake_case
 */
export function objectKeysToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(objectKeysToSnake)
  }

  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = camelToSnake(key)
      result[snakeKey] = objectKeysToSnake(obj[key])
      return result
    }, {} as any)
  }

  return obj
}
