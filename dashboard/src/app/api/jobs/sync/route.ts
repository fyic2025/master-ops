import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createBooClient } from '@/lib/supabase'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

// Jobs that support manual sync
const SYNCABLE_JOBS: Record<string, {
  business: string
  script: string
  args?: string
  description: string
  timeout?: number
}> = {
  'stock-sync': {
    business: 'boo',
    script: 'scripts/boo/sync-all-suppliers.js',
    description: 'Sync stock from all suppliers (UHP, Kadac, Oborne, Unleashed)',
    timeout: 300000 // 5 minutes - this job takes ~1 min normally
  },
  'livechat-sync': {
    business: 'boo',
    script: 'shared/libs/integrations/livechat/sync-conversations.js',
    args: '--days=7',
    description: 'Sync LiveChat conversations'
  },
  'gmc-sync': {
    business: 'boo',
    script: 'shared/libs/integrations/google-merchant/sync-products.js',
    description: 'Sync Google Merchant Center products'
  },
  'gsc-issues-sync': {
    business: 'boo',
    script: 'shared/libs/integrations/gsc/sync-gsc-issues.js',
    args: '--skip-performance',
    description: 'Sync GSC issues'
  }
}

export async function POST(request: NextRequest) {
  try {
    const { jobName } = await request.json()

    if (!jobName) {
      return NextResponse.json({ error: 'Job name required' }, { status: 400 })
    }

    const job = SYNCABLE_JOBS[jobName]
    if (!job) {
      return NextResponse.json({
        error: `Job "${jobName}" does not support manual sync`,
        supportedJobs: Object.keys(SYNCABLE_JOBS)
      }, { status: 400 })
    }

    // Update job status to show it's running
    const supabase = createServerClient()
    await supabase
      .from('dashboard_job_status')
      .update({
        status: 'unknown',
        error_message: 'Sync in progress...'
      })
      .eq('job_name', jobName)
      .eq('business', job.business)

    // Run the sync script (scripts are in dashboard/scripts/)
    const dashboardRoot = process.cwd()
    const scriptPath = path.join(dashboardRoot, job.script)
    const command = `node "${scriptPath}" ${job.args || ''}`

    console.log(`Running sync: ${command}`)

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: dashboardRoot,
        timeout: job.timeout || 300000, // Use job-specific timeout or default 5 minutes
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      })

      console.log('Sync stdout:', stdout)
      if (stderr) console.log('Sync stderr:', stderr)

      // Update job status to healthy
      const now = new Date().toISOString()
      await supabase
        .from('dashboard_job_status')
        .update({
          last_run_at: now,
          last_success_at: now,
          status: 'healthy',
          error_message: null
        })
        .eq('job_name', jobName)
        .eq('business', job.business)

      return NextResponse.json({
        success: true,
        job: jobName,
        message: job.description + ' completed',
        output: stdout.slice(-2000) // Last 2000 chars of output
      })

    } catch (execError: any) {
      console.error('Sync execution error:', execError)

      // Update job status to failed
      await supabase
        .from('dashboard_job_status')
        .update({
          last_run_at: new Date().toISOString(),
          status: 'failed',
          error_message: execError.message?.slice(0, 500)
        })
        .eq('job_name', jobName)
        .eq('business', job.business)

      return NextResponse.json({
        success: false,
        job: jobName,
        error: execError.message
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Sync API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - List syncable jobs
export async function GET() {
  return NextResponse.json({
    syncableJobs: Object.entries(SYNCABLE_JOBS).map(([name, config]) => ({
      name,
      business: config.business,
      description: config.description
    }))
  })
}
