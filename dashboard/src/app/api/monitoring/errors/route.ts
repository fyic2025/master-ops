import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * GET /api/monitoring/errors
 * Returns error statistics for the last 24 hours
 * Used by n8n health check workflow
 */
export async function GET() {
  const supabase = createServerClient()

  // Get error counts from last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: errors, error: queryError } = await supabase
    .from('dashboard_error_logs')
    .select('id, source, level, message, created_at')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(100)

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  // Calculate stats
  const stats = {
    total: errors.length,
    byLevel: {
      error: errors.filter(e => e.level === 'error').length,
      warn: errors.filter(e => e.level === 'warn').length,
      info: errors.filter(e => e.level === 'info').length,
    },
    bySource: {
      frontend: errors.filter(e => e.source === 'frontend').length,
      api: errors.filter(e => e.source === 'api').length,
      network: errors.filter(e => e.source === 'network').length,
      supabase: errors.filter(e => e.source === 'supabase').length,
    },
    recentErrors: errors.filter(e => e.level === 'error').slice(0, 5),
    status: errors.filter(e => e.level === 'error').length > 10 ? 'critical' :
            errors.filter(e => e.level === 'error').length > 0 ? 'warning' : 'healthy',
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(stats)
}
