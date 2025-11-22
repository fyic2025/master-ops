/**
 * Business Helper Utilities
 *
 * Common utilities for working with business data across the platform.
 *
 * Usage:
 * ```typescript
 * import { getBusinessBySlug, getAllBusinesses, formatBusinessName } from '@/shared/libs/utils/business-helpers'
 *
 * const business = await getBusinessBySlug('teelixir')
 * ```
 */

import { serviceClient } from '../../../infra/supabase/client'
import { logger } from '../logger'

export interface Business {
  id: string
  name: string
  slug: string
  type?: string
  status: 'active' | 'inactive' | 'archived'
  hubspot_company_id?: string
  unleashed_customer_code?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

/**
 * Get business by slug
 */
export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  if (!serviceClient) {
    throw new Error('Supabase service client not configured')
  }

  const { data, error } = await serviceClient
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null
    }
    throw error
  }

  return data as Business
}

/**
 * Get business by ID
 */
export async function getBusinessById(id: string): Promise<Business | null> {
  if (!serviceClient) {
    throw new Error('Supabase service client not configured')
  }

  const { data, error } = await serviceClient
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data as Business
}

/**
 * Get all businesses
 */
export async function getAllBusinesses(options?: {
  status?: 'active' | 'inactive' | 'archived'
  includeInactive?: boolean
}): Promise<Business[]> {
  if (!serviceClient) {
    throw new Error('Supabase service client not configured')
  }

  let query = serviceClient.from('businesses').select('*')

  if (options?.status) {
    query = query.eq('status', options.status)
  } else if (!options?.includeInactive) {
    query = query.eq('status', 'active')
  }

  const { data, error } = await query.order('name')

  if (error) throw error

  return (data as Business[]) || []
}

/**
 * Get business by HubSpot company ID
 */
export async function getBusinessByHubSpotId(hubspotId: string): Promise<Business | null> {
  if (!serviceClient) {
    throw new Error('Supabase service client not configured')
  }

  const { data, error } = await serviceClient
    .from('businesses')
    .select('*')
    .eq('hubspot_company_id', hubspotId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data as Business
}

/**
 * Update business HubSpot ID
 */
export async function updateBusinessHubSpotId(
  businessId: string,
  hubspotCompanyId: string
): Promise<Business> {
  if (!serviceClient) {
    throw new Error('Supabase service client not configured')
  }

  const { data, error } = await serviceClient
    .from('businesses')
    .update({ hubspot_company_id: hubspotCompanyId })
    .eq('id', businessId)
    .select()
    .single()

  if (error) throw error

  logger.info('Updated business HubSpot ID', {
    source: 'system',
    operation: 'updateBusinessHubSpotId',
    businessId,
    metadata: { hubspotCompanyId },
  })

  return data as Business
}

/**
 * Update business Unleashed customer code
 */
export async function updateBusinessUnleashedCode(
  businessId: string,
  unleashedCustomerCode: string
): Promise<Business> {
  if (!serviceClient) {
    throw new Error('Supabase service client not configured')
  }

  const { data, error } = await serviceClient
    .from('businesses')
    .update({ unleashed_customer_code: unleashedCustomerCode })
    .eq('id', businessId)
    .select()
    .single()

  if (error) throw error

  logger.info('Updated business Unleashed code', {
    source: 'system',
    operation: 'updateBusinessUnleashedCode',
    businessId,
    metadata: { unleashedCustomerCode },
  })

  return data as Business
}

/**
 * Update business metadata
 */
export async function updateBusinessMetadata(
  businessId: string,
  metadata: Record<string, any>
): Promise<Business> {
  if (!serviceClient) {
    throw new Error('Supabase service client not configured')
  }

  const { data, error } = await serviceClient
    .from('businesses')
    .update({ metadata })
    .eq('id', businessId)
    .select()
    .single()

  if (error) throw error

  return data as Business
}

/**
 * Format business name for display
 */
export function formatBusinessName(business: Business | string): string {
  if (typeof business === 'string') {
    return business
  }
  return business.name
}

/**
 * Get business domain from metadata
 */
export function getBusinessDomain(business: Business): string | undefined {
  return business.metadata?.domain
}

/**
 * Check if business is active
 */
export function isBusinessActive(business: Business): boolean {
  return business.status === 'active'
}

/**
 * Get business statistics from logs
 */
export async function getBusinessStats(
  businessId: string,
  hours: number = 24
): Promise<{
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  successRate: number
  activeIntegrations: number
}> {
  if (!serviceClient) {
    throw new Error('Supabase service client not configured')
  }

  const { data, error } = await serviceClient.rpc('get_business_stats', {
    p_business_slug: (await getBusinessById(businessId))?.slug || '',
    p_hours: hours,
  })

  if (error) throw error

  return data[0] || {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    successRate: 0,
    activeIntegrations: 0,
  }
}

/**
 * Get all business slugs
 */
export async function getAllBusinessSlugs(): Promise<string[]> {
  const businesses = await getAllBusinesses()
  return businesses.map(b => b.slug)
}

/**
 * Map business slug to name
 */
export const BUSINESS_NAMES: Record<string, string> = {
  'teelixir': 'Teelixir',
  'elevate-wholesale': 'Elevate Wholesale',
  'buy-organics-online': 'Buy Organics Online',
  'red-hill-fresh': 'Red Hill Fresh',
}

/**
 * Get business name from slug
 */
export function getBusinessNameFromSlug(slug: string): string {
  return BUSINESS_NAMES[slug] || slug
}

/**
 * Validate business slug
 */
export function isValidBusinessSlug(slug: string): boolean {
  return Object.keys(BUSINESS_NAMES).includes(slug)
}
