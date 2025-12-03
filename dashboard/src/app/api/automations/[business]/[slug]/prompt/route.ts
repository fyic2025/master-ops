import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAutomation, isAutomationSupported } from '@/lib/automations/registry'
import { generateClaudePrompt } from '@/lib/automations/prompt-generator'
import type { AutomationInstance, AutomationStats, QueueStatus, ExecutionLog } from '@/lib/automations/types'

// GET /api/automations/[business]/[slug]/prompt - Generate Claude Code prompt
export async function GET(
  request: Request,
  { params }: { params: { business: string; slug: string } }
) {
  try {
    const { business, slug } = params

    // Get automation definition
    const definition = getAutomation(slug)
    if (!definition) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    // Check if automation is supported for this business
    if (!isAutomationSupported(slug, business)) {
      return NextResponse.json(
        { error: `Automation ${slug} is not supported for ${business}` },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Fetch automation config
    const { data: configData } = await supabase
      .from(definition.configTable)
      .select('*')
      .eq('automation_type', slug)
      .single()

    if (!configData) {
      return NextResponse.json({ error: 'Automation config not found' }, { status: 404 })
    }

    // Build instance object
    const instance: AutomationInstance = {
      automation_type: slug,
      business: business as any,
      enabled: configData.enabled,
      config: configData.config,
      last_run_at: configData.last_run_at,
      last_run_result: configData.last_run_result,
      health_status: calculateHealthStatus(configData),
    }

    // Fetch stats
    let stats: AutomationStats | undefined
    if (definition.statsView) {
      const { data: statsData } = await supabase
        .from(definition.statsView)
        .select('*')
        .single()
      if (statsData) {
        stats = statsData as AutomationStats
      }
    }

    // Fetch queue status for today
    let queue: QueueStatus | undefined
    if (definition.queueTable) {
      const today = new Date().toISOString().split('T')[0]
      const { data: queueData } = await supabase
        .from(definition.queueTable)
        .select('scheduled_date, scheduled_hour, status')
        .eq('scheduled_date', today)

      if (queueData && queueData.length > 0) {
        const pending = queueData.filter((q: any) => q.status === 'pending').length
        const sent = queueData.filter((q: any) => q.status === 'sent').length
        const failed = queueData.filter((q: any) => q.status === 'failed').length

        queue = {
          date: today,
          pending,
          sent,
          failed,
          total: queueData.length,
        }
      }
    }

    // Fetch recent execution logs
    let recentLogs: ExecutionLog[] | undefined
    const { data: logsData } = await supabase
      .from('automation_execution_logs')
      .select('*')
      .eq('automation_type', slug)
      .eq('business', business)
      .order('started_at', { ascending: false })
      .limit(5)

    if (logsData) {
      recentLogs = logsData as ExecutionLog[]
    }

    // Fetch pool data (for winback)
    let pool: { total: number; available: number } | undefined
    if (slug === 'winback_40') {
      const { data: poolData, count } = await supabase
        .from('tlx_klaviyo_unengaged')
        .select('*', { count: 'exact', head: true })

      const { count: sentCount } = await supabase
        .from('tlx_winback_emails')
        .select('*', { count: 'exact', head: true })

      pool = {
        total: count || 0,
        available: Math.max(0, (count || 0) - (sentCount || 0)),
      }
    }

    // Generate prompt
    const prompt = generateClaudePrompt({
      definition,
      instance,
      stats,
      queue,
      recentLogs,
      pool,
    })

    return NextResponse.json({ prompt })
  } catch (error: any) {
    console.error('Prompt generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function calculateHealthStatus(config: any): AutomationInstance['health_status'] {
  if (!config.enabled) return 'disabled'
  if (!config.last_run_at) return 'unknown'

  const lastRun = new Date(config.last_run_at)
  const now = new Date()
  const hoursSinceRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60)

  if (config.last_run_result?.success === false) return 'failed'
  if (hoursSinceRun > 3) return 'stale'

  return 'healthy'
}
