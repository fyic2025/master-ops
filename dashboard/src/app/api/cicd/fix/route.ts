import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * POST /api/cicd/fix
 *
 * Actions:
 * - action: 'start' - Mark issues as in_progress when user clicks "Fix"
 * - action: 'verify' - Process verification results after health check
 * - action: 'retry' - Reset failed issues to in_progress for retry
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const { action, issueIds, prompt, verificationResults } = body

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 })
    }

    switch (action) {
      case 'start': {
        // Mark issues as in_progress when user clicks "Fix"
        if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
          return NextResponse.json({ error: 'issueIds array required' }, { status: 400 })
        }

        const { data, error } = await supabase.rpc('start_fix_attempt', {
          p_issue_ids: issueIds,
          p_prompt: prompt || null
        })

        if (error) {
          console.error('Start fix attempt error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          action: 'start',
          updated: data,
          issueIds,
          timestamp: new Date().toISOString()
        })
      }

      case 'verify': {
        // Process verification results after health check runs
        if (!verificationResults || !Array.isArray(verificationResults)) {
          return NextResponse.json({ error: 'verificationResults array required' }, { status: 400 })
        }

        let fixedCount = 0
        let failedCount = 0
        const results: { issueId: string; status: string }[] = []

        for (const result of verificationResults) {
          const { issueId, stillExists } = result

          if (!issueId) continue

          const { data, error } = await supabase.rpc('process_fix_verification', {
            p_issue_id: issueId,
            p_still_exists: stillExists
          })

          if (error) {
            console.error(`Verification error for ${issueId}:`, error)
            results.push({ issueId, status: 'error' })
          } else {
            results.push({ issueId, status: data })
            if (data === 'resolved') fixedCount++
            else if (data === 'failed') failedCount++
          }
        }

        return NextResponse.json({
          success: true,
          action: 'verify',
          fixedCount,
          failedCount,
          results,
          timestamp: new Date().toISOString()
        })
      }

      case 'retry': {
        // Reset failed issues to in_progress for retry
        if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
          return NextResponse.json({ error: 'issueIds array required' }, { status: 400 })
        }

        // Use start_fix_attempt which increments attempt count
        const { data, error } = await supabase.rpc('start_fix_attempt', {
          p_issue_ids: issueIds,
          p_prompt: prompt || null
        })

        if (error) {
          console.error('Retry fix attempt error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          action: 'retry',
          updated: data,
          issueIds,
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error: any) {
    console.error('CI/CD fix API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * GET /api/cicd/fix
 *
 * Get issues grouped by fix status for the 3-bucket UI
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Get issues grouped by fix_status
    const { data: groupedData, error: groupError } = await supabase.rpc('get_cicd_issues_by_fix_status')

    if (groupError) {
      console.error('Get fix status groups error:', groupError)
      // Fall back to manual grouping
    }

    // Also get a flat list of all in_progress issues for verification
    const { data: inProgressIssues, error: ipError } = await supabase
      .from('cicd_issues')
      .select('id, issue_type, file_path, line_number, message, code, fix_attempt_count')
      .eq('fix_status', 'in_progress')
      .is('resolved_at', null)

    if (ipError) {
      console.error('Get in_progress issues error:', ipError)
    }

    // Get failed issues for retry
    const { data: failedIssues, error: failedError } = await supabase
      .from('cicd_issues')
      .select('id, issue_type, file_path, line_number, message, code, fix_attempt_count, last_fix_attempt_at')
      .eq('fix_status', 'failed')
      .is('resolved_at', null)
      .order('fix_attempt_count', { ascending: false })

    if (failedError) {
      console.error('Get failed issues error:', failedError)
    }

    // Count by status
    const { data: statsData } = await supabase.rpc('get_cicd_stats')

    return NextResponse.json({
      byStatus: groupedData || [],
      inProgress: inProgressIssues || [],
      failed: failedIssues || [],
      stats: statsData?.[0] || {
        pending_count: 0,
        in_progress_count: 0,
        failed_count: 0
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('CI/CD fix GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
