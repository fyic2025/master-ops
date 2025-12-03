// Automation Registry - Central definition of all automation types

import type { AutomationDefinition } from './types'

export const AUTOMATION_REGISTRY: Record<string, AutomationDefinition> = {
  // ============================================================================
  // TEELIXIR AUTOMATIONS
  // ============================================================================
  anniversary_upsell: {
    slug: 'anniversary_upsell',
    name: 'Anniversary Upsell',
    description: 'Send personalized anniversary emails with 15% discount and upsell offers to first-time customers',
    category: 'email',
    icon: 'Gift',
    supportedBusinesses: ['teelixir'],
    queueScript: 'teelixir/scripts/queue-anniversary-emails.ts',
    processScript: 'teelixir/scripts/send-anniversary-upsell.ts',
    relevantFiles: [
      'teelixir/scripts/send-anniversary-upsell.ts',
      'teelixir/scripts/queue-anniversary-emails.ts',
      'teelixir/scripts/sync-shopify-variants.ts',
      'infra/supabase/migrations/20251203_anniversary_upsell.sql',
    ],
    configTable: 'tlx_automation_config',
    queueTable: 'tlx_anniversary_queue',
    logsTable: 'tlx_anniversary_discounts',
    statsView: 'tlx_anniversary_stats',
    defaultConfig: {
      discount_percent: 15,
      expiration_days: 14,
      small_size_lead_days: 7,
      large_size_lead_days: 12,
      large_size_threshold_grams: 250,
      daily_limit: 50,
      send_window_start: 9,
      send_window_end: 19,
      sender_email: 'colette@teelixir.com',
      sender_name: 'Colette from Teelixir',
      reply_to_email: 'colette@teelixir.com',
      discount_code_format: '{FULLNAME}15',
    },
    endpoints: {
      config: '/api/automations/config',
      stats: '/api/automations/anniversary/stats',
      queue: '/api/automations/anniversary/queue',
      recent: '/api/automations/anniversary/recent',
    },
  },

  winback_40: {
    slug: 'winback_40',
    name: 'Winback Campaign',
    description: 'Send 40% discount offers to unengaged customers via GSuite email',
    category: 'email',
    icon: 'Mail',
    supportedBusinesses: ['teelixir'],
    queueScript: 'teelixir/scripts/queue-winback-emails.ts',
    processScript: 'teelixir/scripts/send-winback-emails.ts',
    relevantFiles: [
      'teelixir/scripts/send-winback-emails.ts',
      'teelixir/scripts/queue-winback-emails.ts',
      'teelixir/scripts/sync-klaviyo-unengaged.ts',
      'infra/supabase/migrations/20251201_teelixir_automations.sql',
    ],
    configTable: 'tlx_automation_config',
    queueTable: 'tlx_winback_queue',
    logsTable: 'tlx_winback_emails',
    statsView: 'tlx_winback_stats',
    defaultConfig: {
      daily_limit: 20,
      discount_code: 'MISSYOU40',
      discount_percent: 40,
      sender_email: 'colette@teelixir.com',
      sender_name: 'Colette from Teelixir',
      subject_template: '{{ first_name }}, we miss you! Here\'s 40% off',
      klaviyo_segment_id: null,
    },
    endpoints: {
      config: '/api/automations/config',
      stats: '/api/automations/winback/stats',
      queue: '/api/automations/winback/queue',
      recent: '/api/automations/winback/recent',
    },
  },

  // ============================================================================
  // ELEVATE AUTOMATIONS
  // ============================================================================
  prospecting: {
    slug: 'prospecting',
    name: 'Prospecting Outreach',
    description: 'Automated prospecting emails to potential wholesale customers',
    category: 'email',
    icon: 'Target',
    supportedBusinesses: ['elevate'],
    processScript: 'elevate-wholesale/scripts/prospecting/email-sender.ts',
    relevantFiles: [
      'elevate-wholesale/scripts/prospecting/email-sender.ts',
      'infra/supabase/migrations/20251128_prospecting_schema.sql',
    ],
    configTable: 'elevate_automation_config',
    logsTable: 'prospecting_emails',
    defaultConfig: {
      daily_limit: 50,
      send_window_start: 9,
      send_window_end: 17,
    },
    endpoints: {
      config: '/api/automations/config',
      stats: '/api/automations/prospecting/stats',
    },
  },

  // ============================================================================
  // BOO AUTOMATIONS
  // ============================================================================
  boo_email_sequences: {
    slug: 'boo_email_sequences',
    name: 'Email Sequences',
    description: 'Multi-step email automation for welcome, cart recovery, and winback',
    category: 'email',
    icon: 'Mail',
    supportedBusinesses: ['boo'],
    processScript: 'buy-organics-online/email-marketing/scripts/process-email-queue.ts',
    relevantFiles: [
      'buy-organics-online/email-marketing/scripts/process-email-queue.ts',
      'infra/supabase/migrations/20251201_boo_email_marketing.sql',
    ],
    configTable: 'boo_email_automation_config',
    queueTable: 'boo_email_automation_queue',
    defaultConfig: {
      daily_limit: 200,
      send_window_start: 9,
      send_window_end: 18,
    },
    endpoints: {
      config: '/api/automations/config',
      stats: '/api/automations/boo/email/stats',
    },
  },
}

// Get automations for a specific business
export function getAutomationsForBusiness(business: string): AutomationDefinition[] {
  return Object.values(AUTOMATION_REGISTRY).filter(
    (automation) => automation.supportedBusinesses.includes(business as any)
  )
}

// Get a specific automation by slug
export function getAutomation(slug: string): AutomationDefinition | undefined {
  return AUTOMATION_REGISTRY[slug]
}

// Check if an automation is supported for a business
export function isAutomationSupported(slug: string, business: string): boolean {
  const automation = getAutomation(slug)
  return automation?.supportedBusinesses.includes(business as any) ?? false
}
