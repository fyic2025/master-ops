import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

// POST /api/automations/winback/sync - Trigger Klaviyo sync
export async function POST() {
  try {
    const supabase = createServerClient()
    const startTime = Date.now()

    console.log('[Winback Sync] Manual sync triggered from dashboard')

    // Update status to running
    await supabase
      .from('tlx_automation_config')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_result: {
          type: 'sync',
          triggered_from: 'dashboard',
          status: 'running',
          started_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('automation_type', 'winback_40')

    // Execute the sync script
    const scriptPath = path.resolve(process.cwd(), '..', 'teelixir', 'scripts', 'sync-klaviyo-unengaged.ts')
    const rootDir = path.resolve(process.cwd(), '..')

    try {
      const { stdout, stderr } = await execAsync(
        `npx tsx "${scriptPath}"`,
        {
          cwd: rootDir,
          timeout: 180000, // 3 minute timeout
          env: { ...process.env }
        }
      )

      console.log('[Winback Sync] Output:', stdout)
      if (stderr) console.error('[Winback Sync] Stderr:', stderr)

      // Extract profile count from output
      const profileMatch = stdout.match(/Total profiles: (\d+)/)
      const profileCount = profileMatch ? parseInt(profileMatch[1]) : null

      const addedMatch = stdout.match(/Profiles added:\s+(\d+)/)
      const addedCount = addedMatch ? parseInt(addedMatch[1]) : null

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
        .eq('job_name', 'winback-klaviyo-sync')
        .eq('business', 'teelixir')

      // Update automation config with result
      await supabase
        .from('tlx_automation_config')
        .update({
          last_run_result: {
            type: 'sync',
            triggered_from: 'dashboard',
            status: 'success',
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
            profiles_synced: profileCount,
            profiles_added: addedCount
          },
          updated_at: new Date().toISOString()
        })
        .eq('automation_type', 'winback_40')

      return NextResponse.json({
        success: true,
        message: 'Sync completed successfully',
        profiles_synced: profileCount,
        profiles_added: addedCount,
        duration_ms: Date.now() - startTime
      })

    } catch (execError: any) {
      console.error('[Winback Sync] Exec error:', execError)

      // Update job status to failed
      await supabase
        .from('dashboard_job_status')
        .update({
          last_run_at: new Date().toISOString(),
          status: 'failed',
          error_message: execError.message,
          updated_at: new Date().toISOString()
        })
        .eq('job_name', 'winback-klaviyo-sync')
        .eq('business', 'teelixir')

      // Update automation config with failure
      await supabase
        .from('tlx_automation_config')
        .update({
          last_run_result: {
            type: 'sync',
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
    console.error('Winback sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
