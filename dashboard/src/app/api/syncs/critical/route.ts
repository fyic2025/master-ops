import { NextResponse } from 'next/server'
import { createServerClient, createBooClient } from '@/lib/supabase'

interface CriticalSync {
  id: string
  name: string
  description: string
  business: string
  last_run_at: string | null
  last_success_at: string | null
  status: 'healthy' | 'stale' | 'error' | 'unknown'
  stats?: {
    enabled?: number
    disabled?: number
    updated?: number
    skipped?: number
    errors?: number
  }
  expected_interval_hours: number
}

// Static list of critical syncs to monitor
const CRITICAL_SYNCS = [
  {
    id: 'boo-bc-availability',
    name: 'Supplier → BC Availability',
    description: 'Syncs supplier stock levels to BigCommerce product availability',
    business: 'boo',
    expected_interval_hours: 12, // Runs at 8am and 8pm
    log_source: 'bc-availability-update',
  },
  {
    id: 'boo-bc-product-sync',
    name: 'BC → Supabase Products',
    description: 'Syncs BigCommerce products to Supabase for analytics',
    business: 'boo',
    expected_interval_hours: 24,
    log_source: 'bc-product-sync',
  },
  {
    id: 'boo-supplier-sync',
    name: 'Supplier Catalog Sync',
    description: 'Loads supplier product catalogs (UHP, Kadac, Oborne, Unleashed)',
    business: 'boo',
    expected_interval_hours: 24,
    log_source: 'supplier-sync',
  },
]

export async function GET() {
  try {
    const supabase = createServerClient()
    const booSupabase = createBooClient()

    const syncs: CriticalSync[] = []

    for (const syncDef of CRITICAL_SYNCS) {
      // Check automation_logs for this sync
      const { data: logs } = await booSupabase
        .from('automation_logs')
        .select('*')
        .eq('workflow_name', syncDef.log_source)
        .order('started_at', { ascending: false })
        .limit(1)

      const lastLog = logs?.[0]
      const lastRunAt = lastLog?.completed_at || lastLog?.started_at || null
      const lastSuccessAt = lastLog?.status === 'success' ? lastRunAt : null

      // Calculate status based on freshness
      let status: 'healthy' | 'stale' | 'error' | 'unknown' = 'unknown'

      if (lastLog) {
        if (lastLog.status === 'error' || lastLog.status === 'failed') {
          status = 'error'
        } else if (lastLog.status === 'success') {
          const lastRun = new Date(lastRunAt!)
          const now = new Date()
          const hoursSinceRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60)

          if (hoursSinceRun <= syncDef.expected_interval_hours * 1.5) {
            status = 'healthy'
          } else {
            status = 'stale'
          }
        }
      }

      // Parse stats from log metadata if available
      let stats: CriticalSync['stats'] = undefined
      if (lastLog?.metadata) {
        const meta = typeof lastLog.metadata === 'string'
          ? JSON.parse(lastLog.metadata)
          : lastLog.metadata

        if (meta.enabled !== undefined || meta.disabled !== undefined) {
          stats = {
            enabled: meta.enabled,
            disabled: meta.disabled,
            updated: meta.updated,
            skipped: meta.skipped,
            errors: meta.errors,
          }
        }
      }

      syncs.push({
        id: syncDef.id,
        name: syncDef.name,
        description: syncDef.description,
        business: syncDef.business,
        last_run_at: lastRunAt,
        last_success_at: lastSuccessAt,
        status,
        stats,
        expected_interval_hours: syncDef.expected_interval_hours,
      })
    }

    // Summary
    const summary = {
      total: syncs.length,
      healthy: syncs.filter(s => s.status === 'healthy').length,
      unhealthy: syncs.filter(s => s.status !== 'healthy').length,
    }

    return NextResponse.json({
      syncs,
      summary,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Critical syncs API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
