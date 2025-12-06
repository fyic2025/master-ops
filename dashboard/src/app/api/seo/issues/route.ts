import { NextRequest, NextResponse } from 'next/server'
import { createBooClient, createServerClient } from '@/lib/supabase'

export interface SeoIssueRow {
  id: string
  business: string
  url: string
  issue_type: string
  severity: 'critical' | 'warning'
  status: string
  fix_status: 'pending' | 'in_progress' | 'failed' | 'resolved'
  fix_attempt_count: number
  last_fix_attempt_at: string | null
  linked_task_id: string | null
  first_detected: string
  last_checked: string
  detection_reason: string | null
  traffic_before: number | null
  traffic_after: number | null
  api_coverage_state: string | null
  api_page_fetch_state: string | null
  created_at: string
  updated_at: string
}

export interface IssuesResponse {
  business: string
  issues: SeoIssueRow[]
  summary: {
    total: number
    critical: number
    warning: number
    byType: Record<string, number>
    byFixStatus: Record<string, number>
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'
  const status = searchParams.get('status') || 'active'
  const severity = searchParams.get('severity') // 'critical' | 'warning' | null
  const issueType = searchParams.get('issue_type')
  const fixStatus = searchParams.get('fix_status') // 'pending' | 'in_progress' | 'failed' | 'resolved'
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    // Use BOO Supabase for BOO, main Supabase for others
    const supabase = business === 'boo' ? createBooClient() : createServerClient()

    // Build query
    let query = supabase
      .from('gsc_issue_urls')
      .select('*')
      .eq('business', business)
      .eq('status', status)
      .order('first_detected', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply optional filters
    if (severity) {
      query = query.eq('severity', severity)
    }
    if (issueType) {
      query = query.eq('issue_type', issueType)
    }
    if (fixStatus) {
      query = query.eq('fix_status', fixStatus)
    }

    const { data: issues, error } = await query

    if (error) throw error

    // Calculate summary
    const allIssues = issues || []
    const summary = {
      total: allIssues.length,
      critical: allIssues.filter(i => i.severity === 'critical').length,
      warning: allIssues.filter(i => i.severity === 'warning').length,
      byType: {} as Record<string, number>,
      byFixStatus: {} as Record<string, number>,
    }

    // Group by type
    for (const issue of allIssues) {
      summary.byType[issue.issue_type] = (summary.byType[issue.issue_type] || 0) + 1
      const fs = issue.fix_status || 'pending'
      summary.byFixStatus[fs] = (summary.byFixStatus[fs] || 0) + 1
    }

    return NextResponse.json({
      business,
      issues: allIssues,
      summary,
    } as IssuesResponse)

  } catch (error: any) {
    console.error('SEO Issues API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch SEO issues' },
      { status: 500 }
    )
  }
}

// POST - Bulk update issue statuses (for batch operations)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { business, issueIds, updates } = body

    if (!business || !issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: business, issueIds (array)' },
        { status: 400 }
      )
    }

    const supabase = business === 'boo' ? createBooClient() : createServerClient()

    // Validate updates
    const allowedFields = ['fix_status', 'linked_task_id']
    const sanitizedUpdates: Record<string, any> = {}

    for (const [key, value] of Object.entries(updates || {})) {
      if (allowedFields.includes(key)) {
        sanitizedUpdates[key] = value
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      )
    }

    // Add timestamp
    sanitizedUpdates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('gsc_issue_urls')
      .update(sanitizedUpdates)
      .in('id', issueIds)
      .eq('business', business)
      .select('id, fix_status')

    if (error) throw error

    return NextResponse.json({
      updated: data?.length || 0,
      issues: data,
    })

  } catch (error: any) {
    console.error('SEO Issues POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update issues' },
      { status: 500 }
    )
  }
}
