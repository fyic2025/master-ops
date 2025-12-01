import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

// POST /api/automations/winback/send - Trigger email send batch
export async function POST() {
  try {
    const supabase = createServerClient()
    const startTime = Date.now()

    // Check if automation is enabled
    const { data: config, error: configError } = await supabase
      .from('tlx_automation_config')
      .select('enabled, config')
      .eq('automation_type', 'winback_40')
      .single()

    if (configError) {
      console.error('Config fetch error:', configError)
      return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }

    if (!config?.enabled) {
      return NextResponse.json(
        { error: 'Automation is disabled. Enable it first.' },
        { status: 400 }
      )
    }

    // Check how many we've sent today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: sentToday, error: countError } = await supabase
      .from('tlx_winback_emails')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', today.toISOString())

    if (countError) {
      console.error('Sent count error:', countError)
    }

    const dailyLimit = config.config?.daily_limit || 20
    const remaining = Math.max(0, dailyLimit - (sentToday || 0))

    if (remaining === 0) {
      return NextResponse.json(
        { error: `Daily limit reached (${dailyLimit}). Try again tomorrow.` },
        { status: 400 }
      )
    }

    console.log(`[Winback Send] Manual send triggered from dashboard (${remaining} remaining)`)

    // Update status to running
    await supabase
      .from('tlx_automation_config')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_result: {
          type: 'send',
          triggered_from: 'dashboard',
          status: 'running',
          started_at: new Date().toISOString(),
          remaining_today: remaining
        },
        updated_at: new Date().toISOString()
      })
      .eq('automation_type', 'winback_40')

    // Execute the send script
    const scriptPath = path.resolve(process.cwd(), '..', 'teelixir', 'scripts', 'send-winback-emails.ts')
    const rootDir = path.resolve(process.cwd(), '..')

    try {
      const { stdout, stderr } = await execAsync(
        `npx tsx "${scriptPath}"`,
        {
          cwd: rootDir,
          timeout: 300000, // 5 minute timeout
          env: { ...process.env }
        }
      )

      console.log('[Winback Send] Output:', stdout)
      if (stderr) console.error('[Winback Send] Stderr:', stderr)

      // Extract counts from output
      const sentMatch = stdout.match(/Emails sent:\s+(\d+)/)
      const sentCount = sentMatch ? parseInt(sentMatch[1]) : 0

      const failedMatch = stdout.match(/Emails failed:\s+(\d+)/)
      const failedCount = failedMatch ? parseInt(failedMatch[1]) : 0

      // Update job status to healthy
      await supabase
        .from('dashboard_job_status')
        .update({
          last_run_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          status: 'healthy',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('job_name', 'winback-email-send')
        .eq('business', 'teelixir')

      // Update automation config with result
      await supabase
        .from('tlx_automation_config')
        .update({
          last_run_result: {
            type: 'send',
            triggered_from: 'dashboard',
            status: 'success',
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
            emails_sent: sentCount,
            emails_failed: failedCount
          },
          updated_at: new Date().toISOString()
        })
        .eq('automation_type', 'winback_40')

      return NextResponse.json({
        success: true,
        message: `Send completed. ${sentCount} emails sent.`,
        emails_sent: sentCount,
        emails_failed: failedCount,
        duration_ms: Date.now() - startTime
      })

    } catch (execError: any) {
      console.error('[Winback Send] Exec error:', execError)

      // Update job status to failed
      await supabase
        .from('dashboard_job_status')
        .update({
          last_run_at: new Date().toISOString(),
          status: 'failed',
          error_message: execError.message,
          updated_at: new Date().toISOString()
        })
        .eq('job_name', 'winback-email-send')
        .eq('business', 'teelixir')

      // Update automation config with failure
      await supabase
        .from('tlx_automation_config')
        .update({
          last_run_result: {
            type: 'send',
            triggered_from: 'dashboard',
            status: 'failed',
            error: execError.message,
            completed_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('automation_type', 'winback_40')

      return NextResponse.json({
        success: false,
        error: execError.message
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Winback send error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
