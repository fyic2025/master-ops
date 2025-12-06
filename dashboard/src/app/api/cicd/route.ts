import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

interface CicdIssue {
  id: string
  issue_type: string
  severity: string
  file_path: string | null
  line_number: number | null
  message: string
  code: string | null
  details: Record<string, unknown> | null
  auto_fixable: boolean
  fix_applied: boolean
  first_seen_at: string
  last_seen_at: string
  resolved_at: string | null
  occurrence_count: number
  source: string
  branch: string
  fix_status: 'pending' | 'in_progress' | 'failed' | 'resolved'
  fix_attempt_count: number
  last_fix_attempt_at: string | null
}

interface CicdStats {
  total_active: number
  typescript_errors: number
  test_failures: number
  lint_errors: number
  build_errors: number
  auto_fixable: number
  oldest_issue_hours: number
  pending_count: number
  in_progress_count: number
  failed_count: number
}

// GET - Fetch all active CI/CD issues
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const issueType = searchParams.get('type')
    const includeResolved = searchParams.get('includeResolved') === 'true'

    // Get stats
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_cicd_stats')

    // Build query for issues
    let query = supabase
      .from('cicd_issues')
      .select('*')
      .order('last_seen_at', { ascending: false })

    if (!includeResolved) {
      query = query.is('resolved_at', null)
    }

    if (issueType) {
      query = query.eq('issue_type', issueType)
    }

    const { data: issues, error: issuesError } = await query.limit(100)

    if (issuesError) {
      console.error('CI/CD issues fetch error:', issuesError)
      return NextResponse.json({ error: issuesError.message }, { status: 500 })
    }

    // Get recent scans
    const { data: recentScans } = await supabase
      .from('cicd_scan_history')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)

    const stats: CicdStats = statsData?.[0] || {
      total_active: 0,
      typescript_errors: 0,
      test_failures: 0,
      lint_errors: 0,
      build_errors: 0,
      auto_fixable: 0,
      oldest_issue_hours: 0
    }

    // Group by type
    const byType: Record<string, CicdIssue[]> = {}
    for (const issue of (issues || []) as CicdIssue[]) {
      if (!byType[issue.issue_type]) {
        byType[issue.issue_type] = []
      }
      byType[issue.issue_type].push(issue)
    }

    // Group by file
    const byFile: Record<string, CicdIssue[]> = {}
    for (const issue of (issues || []) as CicdIssue[]) {
      const key = issue.file_path || 'unknown'
      if (!byFile[key]) {
        byFile[key] = []
      }
      byFile[key].push(issue)
    }

    // Group by error code (e.g., TS7006, TS2307) - sorted by count descending
    const byErrorCode: Record<string, CicdIssue[]> = {}
    for (const issue of (issues || []) as CicdIssue[]) {
      const key = issue.code || 'unknown'
      if (!byErrorCode[key]) {
        byErrorCode[key] = []
      }
      byErrorCode[key].push(issue)
    }

    // Sort by count descending for prioritization
    const sortedByErrorCode = Object.entries(byErrorCode)
      .sort(([, a], [, b]) => b.length - a.length)
      .reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {} as Record<string, CicdIssue[]>)

    return NextResponse.json({
      issues: issues || [],
      byType,
      byFile,
      byErrorCode: sortedByErrorCode,
      stats,
      recentScans: recentScans || [],
      lastUpdated: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('CI/CD API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Log new issues from a scan
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const { issues, scanType, source, commitSha, branch } = body

    if (!issues || !Array.isArray(issues)) {
      return NextResponse.json({ error: 'Issues array required' }, { status: 400 })
    }

    // Start a scan record
    const { data: scan, error: scanError } = await supabase
      .from('cicd_scan_history')
      .insert({
        scan_type: scanType || 'full',
        source: source || 'local',
        commit_sha: commitSha,
        branch: branch || 'main',
        status: 'running'
      })
      .select()
      .single()

    if (scanError) {
      console.error('Scan insert error:', scanError)
    }

    const scanStartTime = new Date()
    let newIssues = 0
    let errorCount = 0

    // Upsert each issue
    for (const issue of issues) {
      const { data, error } = await supabase.rpc('upsert_cicd_issue', {
        p_issue_type: issue.type,
        p_severity: issue.severity || 'error',
        p_file_path: issue.file,
        p_line_number: issue.line || null,
        p_message: issue.message,
        p_code: issue.code || null,
        p_details: issue.details || null,
        p_auto_fixable: issue.autoFixable || false,
        p_source: source || 'local',
        p_commit_sha: commitSha || null,
        p_branch: branch || 'main'
      })

      if (error) {
        console.error('Issue upsert error:', error)
        errorCount++
      } else {
        newIssues++
      }
    }

    // Mark old issues of this type as resolved
    // Include all standard issue types to ensure stale issues are resolved even when no new issues of that type
    const issueTypes = [
      ...new Set([
        'typescript_error',
        'test_failure',
        'lint_error',
        'build_error',
        ...issues.map((i: any) => i.type)
      ])
    ]
    let resolvedCount = 0

    for (const issueType of issueTypes) {
      const { data: resolved } = await supabase.rpc('resolve_stale_issues', {
        p_issue_type: issueType,
        p_cutoff_time: scanStartTime.toISOString()
      })
      resolvedCount += resolved || 0
    }

    // Update scan record
    if (scan) {
      await supabase
        .from('cicd_scan_history')
        .update({
          completed_at: new Date().toISOString(),
          total_issues: issues.length,
          new_issues: newIssues,
          resolved_issues: resolvedCount,
          status: errorCount > 0 ? 'completed_with_errors' : 'completed'
        })
        .eq('id', scan.id)
    }

    return NextResponse.json({
      success: true,
      scanId: scan?.id,
      processed: newIssues,
      errors: errorCount,
      resolved: resolvedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('CI/CD POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Resolve an issue or clear all resolved
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const issueId = searchParams.get('id')
    const clearResolved = searchParams.get('clearResolved') === 'true'

    if (clearResolved) {
      // Delete all resolved issues older than 7 days
      const { error } = await supabase
        .from('cicd_issues')
        .delete()
        .not('resolved_at', 'is', null)
        .lt('resolved_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, action: 'cleared_old_resolved' })
    }

    if (issueId) {
      // Mark single issue as resolved
      const { error } = await supabase
        .from('cicd_issues')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', issueId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, resolved: issueId })
    }

    return NextResponse.json({ error: 'Issue ID or clearResolved required' }, { status: 400 })
  } catch (error: any) {
    console.error('CI/CD DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
