import { NextResponse } from 'next/server'
import { createServerClient, createBooClient } from '@/lib/supabase'

interface JobStatus {
  id: string
  job_name: string
  job_type: string
  business: string | null
  schedule: string
  description: string
  last_run_at: string | null
  last_success_at: string | null
  status: 'healthy' | 'stale' | 'failed' | 'unknown'
  expected_interval_hours: number
  error_message: string | null
  relevant_files: string[]
}

interface JobSummary {
  total: number
  healthy: number
  stale: number
  failed: number
  unknown: number
  healthPercentage: number
}

export async function GET() {
  try {
    const supabase = createServerClient()

    // Fetch all job statuses
    const { data: jobs, error } = await supabase
      .from('dashboard_job_status')
      .select('*')
      .order('business', { ascending: true, nullsFirst: false })
      .order('job_name', { ascending: true })

    if (error) {
      console.error('Job status fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const allJobs = (jobs || []) as JobStatus[]

    // Calculate summary
    const summary: JobSummary = {
      total: allJobs.length,
      healthy: allJobs.filter(j => j.status === 'healthy').length,
      stale: allJobs.filter(j => j.status === 'stale').length,
      failed: allJobs.filter(j => j.status === 'failed').length,
      unknown: allJobs.filter(j => j.status === 'unknown').length,
      healthPercentage: allJobs.length > 0
        ? Math.round(100 * allJobs.filter(j => j.status === 'healthy').length / allJobs.length)
        : 0
    }

    // Separate healthy and unhealthy jobs
    const unhealthyJobs = allJobs.filter(j => j.status !== 'healthy')
    const healthyJobs = allJobs.filter(j => j.status === 'healthy')

    // Group by business for display
    const byBusiness: Record<string, JobStatus[]> = {}
    for (const job of allJobs) {
      const key = job.business || 'infrastructure'
      if (!byBusiness[key]) {
        byBusiness[key] = []
      }
      byBusiness[key].push(job)
    }

    return NextResponse.json({
      jobs: allJobs,
      unhealthyJobs,
      healthyJobs,
      byBusiness,
      summary,
      lastUpdated: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Jobs API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Refresh job statuses by checking actual data sources
export async function POST() {
  try {
    const supabase = createServerClient()
    const booSupabase = createBooClient()

    // Refresh job statuses by calling the refresh function
    const { data: refreshResult, error: refreshError } = await supabase
      .rpc('refresh_job_statuses')

    if (refreshError) {
      console.error('Refresh job statuses error:', refreshError)
      // Continue anyway, we'll check other sources
    }

    // Check BOO automation_logs for recent runs
    try {
      const { data: booLogs } = await booSupabase
        .from('automation_logs')
        .select('workflow_name, status, started_at, completed_at')
        .order('started_at', { ascending: false })
        .limit(50)

      if (booLogs && booLogs.length > 0) {
        // Update job statuses based on BOO logs
        for (const log of booLogs) {
          const jobMapping: Record<string, string> = {
            'supplier-stock-sync': 'stock-sync',
            'gmc-sync': 'gmc-sync',
            'gsc-sync': 'gsc-issues-sync',
            'BC → Supabase Product Sync (Script)': 'bc-product-sync',
            'Product-Supplier Linking': 'stock-sync',
          }

          const jobName = jobMapping[log.workflow_name]
          if (jobName) {
            await supabase.rpc('update_job_status', {
              p_job_name: jobName,
              p_business: 'boo',
              p_last_run: log.completed_at || log.started_at,
              p_success: log.status === 'success',
              p_error_message: log.status !== 'success' ? `Status: ${log.status}` : null
            })
          }
        }
      }
    } catch (booError) {
      console.error('Error checking BOO logs:', booError)
    }

    // Fetch updated job statuses
    const { data: jobs, error } = await supabase
      .from('dashboard_job_status')
      .select('*')
      .order('business', { ascending: true, nullsFirst: false })
      .order('job_name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const allJobs = (jobs || []) as JobStatus[]

    const summary: JobSummary = {
      total: allJobs.length,
      healthy: allJobs.filter(j => j.status === 'healthy').length,
      stale: allJobs.filter(j => j.status === 'stale').length,
      failed: allJobs.filter(j => j.status === 'failed').length,
      unknown: allJobs.filter(j => j.status === 'unknown').length,
      healthPercentage: allJobs.length > 0
        ? Math.round(100 * allJobs.filter(j => j.status === 'healthy').length / allJobs.length)
        : 0
    }

    return NextResponse.json({
      jobs: allJobs,
      unhealthyJobs: allJobs.filter(j => j.status !== 'healthy'),
      healthyJobs: allJobs.filter(j => j.status === 'healthy'),
      summary,
      refreshed: true,
      lastUpdated: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Jobs refresh error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
