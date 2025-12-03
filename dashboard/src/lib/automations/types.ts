// Automation Framework Types

import type { BusinessCode } from '../business-config'

export interface AutomationConfig {
  id: string
  automation_type: string
  enabled: boolean
  config: Record<string, unknown>
  last_run_at: string | null
  last_run_result: {
    success?: boolean
    emails_sent?: number
    emails_failed?: number
    errors?: string[]
    type?: string
    hour?: number
  } | null
}

export interface AutomationStats {
  total_sent: number
  total_opened: number
  total_clicked: number
  total_converted: number
  total_bounced: number
  total_failed: number
  total_revenue: number
  sent_today: number
  sent_this_week: number
  open_rate_percent: number
  click_rate_percent: number
  conversion_rate_percent: number
}

export interface QueueStatus {
  date: string
  pending: number
  sent: number
  failed: number
  total: number
  by_hour?: Record<number, { pending: number; sent: number }>
}

export interface ExecutionLog {
  id: string
  automation_type: string
  business: string
  execution_type: string
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  success: boolean | null
  items_processed: number
  items_failed: number
  error_message: string | null
  trigger_source: string
}

export interface AutomationInstance {
  automation_type: string
  business: BusinessCode
  enabled: boolean
  config: Record<string, unknown>
  last_run_at: string | null
  last_run_result: AutomationConfig['last_run_result']
  stats?: AutomationStats
  queue?: QueueStatus
  recent_logs?: ExecutionLog[]
  health_status: 'healthy' | 'stale' | 'failed' | 'disabled' | 'unknown'
}

export interface AutomationDefinition {
  slug: string
  name: string
  description: string
  category: 'email' | 'sync' | 'notification' | 'report'
  icon: string  // Lucide icon name
  supportedBusinesses: BusinessCode[]

  // Scripts
  queueScript?: string
  processScript?: string
  relevantFiles: string[]

  // Database
  configTable: string
  queueTable?: string
  logsTable?: string
  statsView?: string

  // Configuration
  defaultConfig: Record<string, unknown>

  // API endpoints (relative to /api/automations)
  endpoints: {
    config: string
    stats: string
    queue?: string
    recent?: string
  }
}

export interface AutomationWithInstance extends AutomationDefinition {
  instance?: AutomationInstance
}

// Health status calculation
export function calculateHealthStatus(
  instance: Pick<AutomationInstance, 'enabled' | 'last_run_at' | 'last_run_result'>,
  expectedIntervalHours: number = 2
): AutomationInstance['health_status'] {
  if (!instance.enabled) return 'disabled'

  if (!instance.last_run_at) return 'unknown'

  const lastRun = new Date(instance.last_run_at)
  const now = new Date()
  const hoursSinceRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60)

  if (instance.last_run_result?.success === false) return 'failed'

  if (hoursSinceRun > expectedIntervalHours * 1.5) return 'stale'

  return 'healthy'
}
