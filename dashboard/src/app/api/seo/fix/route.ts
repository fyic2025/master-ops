import { NextRequest, NextResponse } from 'next/server'
import { createBooClient, createServerClient } from '@/lib/supabase'
import { generateSeoFixPrompt, generateBatchSeoFixPrompt, getRecommendedAction, SeoIssue } from '@/lib/seo/prompt-generator'

// POST /api/seo/fix - Start a fix (create task, update issue status)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      action, // 'start' | 'complete' | 'copy_prompt' | 'batch_start'
      business,
      issueIds, // Array of issue UUIDs
      executionType, // 'manual' | 'auto'
      success, // For 'complete' action
      resolutionType, // For 'complete' action
    } = body

    if (!action || !business) {
      return NextResponse.json(
        { error: 'Missing required fields: action, business' },
        { status: 400 }
      )
    }

    const supabase = business === 'boo' ? createBooClient() : createServerClient()
    const mainSupabase = createServerClient() // For tasks (always in main db)

    switch (action) {
      case 'copy_prompt': {
        // Just generate prompt, no status change
        if (!issueIds || issueIds.length === 0) {
          return NextResponse.json({ error: 'No issues specified' }, { status: 400 })
        }

        const { data: issues, error } = await supabase
          .from('gsc_issue_urls')
          .select('*')
          .in('id', issueIds)

        if (error) throw error

        const seoIssues: SeoIssue[] = (issues || []).map(i => ({
          id: i.id,
          business: i.business,
          url: i.url,
          issue_type: i.issue_type,
          severity: i.severity,
          status: i.status,
          fix_status: i.fix_status,
          fix_attempt_count: i.fix_attempt_count,
          last_fix_attempt_at: i.last_fix_attempt_at,
          linked_task_id: i.linked_task_id,
          first_detected: i.first_detected,
          last_checked: i.last_checked,
          detection_reason: i.detection_reason,
          traffic_before: i.traffic_before,
          traffic_after: i.traffic_after,
          api_coverage_state: i.api_coverage_state,
          api_page_fetch_state: i.api_page_fetch_state,
        }))

        const prompt = seoIssues.length === 1
          ? generateSeoFixPrompt(seoIssues[0])
          : generateBatchSeoFixPrompt(seoIssues)

        return NextResponse.json({
          prompt,
          issueCount: seoIssues.length,
          issues: seoIssues.map(i => ({ id: i.id, url: i.url, issue_type: i.issue_type })),
        })
      }

      case 'start': {
        // Start fix: create task, update issue status
        if (!issueIds || issueIds.length === 0) {
          return NextResponse.json({ error: 'No issues specified' }, { status: 400 })
        }

        // Fetch issues
        const { data: issues, error: fetchError } = await supabase
          .from('gsc_issue_urls')
          .select('*')
          .in('id', issueIds)

        if (fetchError) throw fetchError

        const seoIssues: SeoIssue[] = (issues || []).map(i => ({
          id: i.id,
          business: i.business,
          url: i.url,
          issue_type: i.issue_type,
          severity: i.severity,
          status: i.status,
          fix_status: i.fix_status,
          fix_attempt_count: i.fix_attempt_count,
          last_fix_attempt_at: i.last_fix_attempt_at,
          linked_task_id: i.linked_task_id,
          first_detected: i.first_detected,
          last_checked: i.last_checked,
          detection_reason: i.detection_reason,
          traffic_before: i.traffic_before,
          traffic_after: i.traffic_after,
          api_coverage_state: i.api_coverage_state,
          api_page_fetch_state: i.api_page_fetch_state,
        }))

        // Generate prompt
        const prompt = seoIssues.length === 1
          ? generateSeoFixPrompt(seoIssues[0])
          : generateBatchSeoFixPrompt(seoIssues)

        // Create task in main database
        const taskTitle = seoIssues.length === 1
          ? `Fix SEO: ${seoIssues[0].issue_type.replace(/_/g, ' ')} - ${new URL(seoIssues[0].url).pathname}`
          : `Fix ${seoIssues.length} SEO issues (${business.toUpperCase()})`

        const taskDescription = seoIssues.length === 1
          ? `${getRecommendedAction(seoIssues[0])}\n\nURL: ${seoIssues[0].url}`
          : `Batch fix for ${seoIssues.length} SEO issues:\n${seoIssues.map(i => `- ${i.url}`).join('\n')}`

        const { data: task, error: taskError } = await mainSupabase
          .from('tasks')
          .insert({
            title: taskTitle,
            description: taskDescription,
            business,
            category: 'seo',
            priority: seoIssues.some(i => i.severity === 'critical') ? 1 : 2,
            status: 'pending',
            execution_type: executionType || 'manual',
            instructions: prompt,
            source_file: 'seo-dashboard',
            created_by: 'seo-fix-api',
          })
          .select()
          .single()

        if (taskError) throw taskError

        // Update issues with fix status and task link
        const { error: updateError } = await supabase
          .from('gsc_issue_urls')
          .update({
            fix_status: 'in_progress',
            last_fix_attempt_at: new Date().toISOString(),
            linked_task_id: task.id,
            updated_at: new Date().toISOString(),
          })
          .in('id', issueIds)

        if (updateError) throw updateError

        // Log task creation
        await mainSupabase.from('task_logs').insert({
          task_id: task.id,
          source: 'seo-fix-api',
          status: 'info',
          message: `SEO fix task created for ${seoIssues.length} issue(s)`,
        })

        return NextResponse.json({
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            execution_type: task.execution_type,
          },
          issuesUpdated: issueIds.length,
          prompt,
        })
      }

      case 'complete': {
        // Complete fix: update issue status based on success
        if (!issueIds || issueIds.length === 0) {
          return NextResponse.json({ error: 'No issues specified' }, { status: 400 })
        }

        const newStatus = success ? 'resolved' : 'failed'

        const { error: updateError } = await supabase
          .from('gsc_issue_urls')
          .update({
            fix_status: newStatus,
            status: success ? 'resolved' : 'active',
            resolved_at: success ? new Date().toISOString() : null,
            resolution_type: resolutionType || (success ? 'manual' : null),
            updated_at: new Date().toISOString(),
          })
          .in('id', issueIds)

        if (updateError) throw updateError

        // If there's a linked task, update it too
        const { data: issues } = await supabase
          .from('gsc_issue_urls')
          .select('linked_task_id')
          .in('id', issueIds)
          .not('linked_task_id', 'is', null)

        const taskIds = [...new Set((issues || []).map(i => i.linked_task_id).filter(Boolean))]

        if (taskIds.length > 0) {
          await mainSupabase
            .from('tasks')
            .update({
              status: success ? 'completed' : 'failed',
              completed_at: success ? new Date().toISOString() : null,
            })
            .in('id', taskIds)
        }

        return NextResponse.json({
          success: true,
          issuesUpdated: issueIds.length,
          newStatus,
          tasksUpdated: taskIds.length,
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('SEO Fix API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process fix request' },
      { status: 500 }
    )
  }
}

// GET /api/seo/fix?business=boo&issueIds=uuid1,uuid2 - Get prompt for issues
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'
  const issueIdsParam = searchParams.get('issueIds')

  if (!issueIdsParam) {
    return NextResponse.json({ error: 'issueIds parameter required' }, { status: 400 })
  }

  const issueIds = issueIdsParam.split(',')

  try {
    const supabase = business === 'boo' ? createBooClient() : createServerClient()

    const { data: issues, error } = await supabase
      .from('gsc_issue_urls')
      .select('*')
      .in('id', issueIds)

    if (error) throw error

    const seoIssues: SeoIssue[] = (issues || []).map(i => ({
      id: i.id,
      business: i.business,
      url: i.url,
      issue_type: i.issue_type,
      severity: i.severity,
      status: i.status,
      fix_status: i.fix_status,
      fix_attempt_count: i.fix_attempt_count,
      last_fix_attempt_at: i.last_fix_attempt_at,
      linked_task_id: i.linked_task_id,
      first_detected: i.first_detected,
      last_checked: i.last_checked,
      detection_reason: i.detection_reason,
      traffic_before: i.traffic_before,
      traffic_after: i.traffic_after,
      api_coverage_state: i.api_coverage_state,
      api_page_fetch_state: i.api_page_fetch_state,
    }))

    const prompt = seoIssues.length === 1
      ? generateSeoFixPrompt(seoIssues[0])
      : generateBatchSeoFixPrompt(seoIssues)

    return NextResponse.json({
      prompt,
      issues: seoIssues,
      recommendedActions: seoIssues.map(i => ({
        id: i.id,
        url: i.url,
        action: getRecommendedAction(i),
      })),
    })

  } catch (error: any) {
    console.error('SEO Fix GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate prompt' },
      { status: 500 }
    )
  }
}
