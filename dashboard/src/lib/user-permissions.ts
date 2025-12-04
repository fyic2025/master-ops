/**
 * User Permissions Configuration
 *
 * Defines user roles and what pages/features they can access.
 * Admin users have full access, restricted users only see specific pages.
 */

import { type BusinessCode } from './business-config'

export type UserRole = 'admin' | 'operations' | 'sales'

export interface UserPermissions {
  email: string
  role: UserRole
  // Which businesses can this user access?
  businesses: BusinessCode[] | 'all'
  // Which pages can this user access within those businesses?
  // Uses page paths like '/shipping', '/livechat', '' (dashboard)
  allowedPages: string[] | 'all'
}

// User permissions configuration
// Add new users here with their access levels
export const USER_PERMISSIONS: UserPermissions[] = [
  // Admin users - full access
  {
    email: 'jayson@teelixir.com',
    role: 'admin',
    businesses: 'all',
    allowedPages: 'all',
  },
  {
    email: 'jayson@fyic.com.au',
    role: 'admin',
    businesses: 'all',
    allowedPages: 'all',
  },
  {
    email: 'peter@teelixir.com',
    role: 'operations',
    businesses: ['home', 'teelixir', 'elevate', 'brandco'],
    allowedPages: 'all',
  },
  {
    email: 'ops@growthcohq.com',
    role: 'admin',
    businesses: 'all',
    allowedPages: 'all',
  },

  // Warehouse/Operations users - shipping access across businesses
  {
    email: 'sales@buyorganicsonline.com.au',
    role: 'operations',
    businesses: ['boo', 'teelixir', 'elevate'],  // All shipping businesses
    allowedPages: ['/shipping', '/livechat', ''],  // Dashboard, Shipping, LiveChat
  },

  // Contractors - task execution and feedback
  {
    email: 'rajani@teelixir.com',
    role: 'operations',
    businesses: ['teelixir', 'elevate'],
    allowedPages: ['/tasks', '/automations', ''],  // Dashboard, Tasks, Automations
  },
]

/**
 * Get user permissions by email
 */
export function getUserPermissions(email: string | null | undefined): UserPermissions | null {
  if (!email) return null
  return USER_PERMISSIONS.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
}

/**
 * Check if email is in the allowed users list
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  return getUserPermissions(email) !== null
}

/**
 * Check if user can access a specific business
 */
export function canAccessBusiness(email: string | null | undefined, businessCode: BusinessCode): boolean {
  const permissions = getUserPermissions(email)
  if (!permissions) return false
  if (permissions.businesses === 'all') return true
  return permissions.businesses.includes(businessCode)
}

/**
 * Check if user can access a specific page within a business
 */
export function canAccessPage(
  email: string | null | undefined,
  businessCode: BusinessCode,
  pagePath: string  // e.g., '/shipping', '/livechat', '' for dashboard
): boolean {
  const permissions = getUserPermissions(email)
  if (!permissions) return false

  // First check business access
  if (permissions.businesses !== 'all' && !permissions.businesses.includes(businessCode)) {
    return false
  }

  // Then check page access
  if (permissions.allowedPages === 'all') return true
  return permissions.allowedPages.includes(pagePath)
}

/**
 * Get allowed businesses for a user
 */
export function getAllowedBusinesses(email: string | null | undefined): BusinessCode[] {
  const permissions = getUserPermissions(email)
  if (!permissions) return []
  if (permissions.businesses === 'all') {
    return ['home', 'boo', 'teelixir', 'elevate', 'rhf', 'brandco']
  }
  return permissions.businesses
}

/**
 * Get allowed pages for a user within a business
 */
export function getAllowedPages(email: string | null | undefined, businessCode: BusinessCode): string[] {
  const permissions = getUserPermissions(email)
  if (!permissions) return []

  // Check business access first
  if (permissions.businesses !== 'all' && !permissions.businesses.includes(businessCode)) {
    return []
  }

  if (permissions.allowedPages === 'all') return ['all']
  return permissions.allowedPages
}

/**
 * Check if user is an admin (full access)
 */
export function isAdmin(email: string | null | undefined): boolean {
  const permissions = getUserPermissions(email)
  return permissions?.role === 'admin'
}

/**
 * Get default redirect path for a user after login
 */
export function getDefaultRedirect(email: string | null | undefined): string {
  const permissions = getUserPermissions(email)
  if (!permissions) return '/login'

  // Admin goes to home dashboard
  if (permissions.role === 'admin') return '/home'

  // Restricted users go to their first allowed business
  const firstBusiness = permissions.businesses === 'all' ? 'home' : permissions.businesses[0]
  const firstPage = permissions.allowedPages === 'all' ? '' : permissions.allowedPages[0]

  return `/${firstBusiness}${firstPage}`
}
