import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

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

const businessNames: Record<string, string> = {
  boo: 'Buy Organics Online',
  teelixir: 'Teelixir',
  elevate: 'Elevate Wholesale',
  rhf: 'Red Hill Fresh',
}

function generateFixInstructions(job: JobStatus): string {
  const businessName = job.business ? businessNames[job.business] || job.business : 'Infrastructure'
  const files = job.relevant_files?.join('\n- ') || 'Check the codebase'
  const lastRunInfo = job.last_success_at
    ? `Last successful run: ${new Date(job.last_success_at).toLocaleString()}`
    : 'Last successful run: NEVER'

  // Base info for all job types
  let instructions = `## Fix Automated Job: ${job.job_name}

**Business:** ${businessName}
**Type:** ${job.job_type}
**Schedule:** ${job.schedule}
**Status:** ${job.status.toUpperCase()}
**Expected Interval:** Every ${job.expected_interval_hours} hours
${lastRunInfo}
${job.error_message ? `**Error:** ${job.error_message}` : ''}

**Description:** ${job.description}

`

  // Type-specific fix instructions
  switch (job.job_type) {
    case 'n8n':
      instructions += `### Fix Steps for n8n Workflow

1. **Open n8n UI:** https://automation.growthcohq.com
2. **Find the workflow** by name: "${job.job_name}"
3. **Check for errors:**
   - Look for nodes with warning/error icons
   - Check credential validity (OAuth may have expired)
   - Review recent execution history for error details
4. **Common fixes:**
   - Re-authenticate OAuth credentials (Gmail, Google Sheets)
   - Update API keys if expired
   - Fix any node configuration issues
5. **Test the workflow** manually before activating
6. **Verify in dashboard** that job shows as healthy

### Relevant Files
- ${files}

### Useful Commands
\`\`\`bash
# Check workflow status
node scripts/check-n8n-workflows.js

# Audit all workflows
node scripts/audit-n8n-workflows.js 1
\`\`\`
`
      break

    case 'cron':
      instructions += `### Fix Steps for Cron Job

1. **Run the script manually** to see errors:
   \`\`\`bash
   node ${job.relevant_files?.[0] || 'path/to/script.js'}
   \`\`\`
2. **Check the output** for any errors or warnings
3. **Common issues:**
   - Missing environment variables
   - API credential expiry
   - Database connection issues
   - Rate limiting
4. **Fix the underlying issue**
5. **Run again** to verify it works
6. **Check dashboard** to confirm job shows healthy

### Relevant Files
- ${files}
`
      break

    case 'edge_function':
      instructions += `### Fix Steps for Edge Function

1. **Check Supabase dashboard** for function logs
2. **Review recent invocations** for errors
3. **Common issues:**
   - Function timeout
   - Missing secrets/environment variables
   - Database query errors
4. **Redeploy if needed:**
   \`\`\`bash
   supabase functions deploy ${job.job_name}
   \`\`\`
5. **Test the function** manually
6. **Verify in dashboard** that job shows healthy

### Relevant Files
- ${files}
`
      break

    case 'webhook':
      instructions += `### Fix Steps for Webhook

1. **Check if the webhook is registered** in the source system
2. **Verify the endpoint** is accessible
3. **Review recent webhook deliveries** for errors
4. **Common issues:**
   - Webhook URL changed
   - Authentication token expired
   - Endpoint returning errors
5. **Re-register webhook** if needed
6. **Trigger a test event** to verify

### Relevant Files
- ${files}
`
      break

    case 'manual':
      instructions += `### Fix Steps for Manual Job

This job requires manual execution. Run it according to the schedule.

1. **Execute the job manually:**
   \`\`\`bash
   node ${job.relevant_files?.[0] || 'path/to/script.js'}
   \`\`\`
2. **Verify successful completion**
3. **Check dashboard** to confirm status updated

### Relevant Files
- ${files}
`
      break

    default:
      instructions += `### Fix Steps

1. **Investigate the issue** by checking relevant logs
2. **Review the relevant files:**
   - ${files}
3. **Fix any errors found**
4. **Test and verify** the job runs successfully
5. **Update dashboard** to confirm healthy status
`
  }

  return instructions
}

function getPriorityForStatus(status: string): number {
  switch (status) {
    case 'failed': return 1  // P1 - Critical
    case 'stale': return 2   // P2 - High
    case 'unknown': return 3 // P3 - Medium
    default: return 2
  }
}

// POST /api/jobs/fix - Create tasks for all unhealthy jobs
export async function POST() {
  try {
    const supabase = createServerClient()

    // Fetch all unhealthy jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('dashboard_job_status')
      .select('*')
      .neq('status', 'healthy')
      .order('status', { ascending: true })
      .order('job_name', { ascending: true })

    if (jobsError) {
      console.error('Error fetching unhealthy jobs:', jobsError)
      return NextResponse.json({ error: jobsError.message }, { status: 500 })
    }

    const unhealthyJobs = (jobs || []) as JobStatus[]

    if (unhealthyJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All jobs are healthy - no tasks to create',
        created: 0,
        skipped: 0
      })
    }

    // Check for existing fix tasks to avoid duplicates
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('title')
      .like('title', 'Fix:%')
      .in('status', ['pending', 'pending_input', 'in_progress', 'blocked', 'scheduled'])

    const existingTitles = new Set((existingTasks || []).map(t => t.title))

    let created = 0
    let skipped = 0
    const createdTasks: string[] = []
    const skippedTasks: string[] = []

    for (const job of unhealthyJobs) {
      const businessLabel = job.business || 'infra'
      const taskTitle = `Fix: ${job.job_name} (${businessLabel})`

      // Skip if task already exists
      if (existingTitles.has(taskTitle)) {
        skipped++
        skippedTasks.push(job.job_name)
        continue
      }

      // Create the fix task
      const task = {
        title: taskTitle,
        description: `${job.description}${job.error_message ? ` - Error: ${job.error_message}` : ''} - Status: ${job.status}`,
        business: job.business || 'overall',
        category: 'automations',
        priority: getPriorityForStatus(job.status),
        status: 'pending_input',
        instructions: generateFixInstructions(job),
        source_file: job.relevant_files?.[0] || null,
        needs_research: job.status === 'unknown',
        created_by: 'job-monitor'
      }

      const { error: insertError } = await supabase
        .from('tasks')
        .insert(task)

      if (insertError) {
        console.error(`Error creating task for ${job.job_name}:`, insertError)
        skipped++
        skippedTasks.push(`${job.job_name} (error)`)
      } else {
        created++
        createdTasks.push(job.job_name)

        // Log the task creation (ignore errors)
        try {
          await supabase.from('task_logs').insert({
            task_id: null, // We don't have the ID since we didn't .select() on insert
            source: 'job-monitor',
            status: 'info',
            message: `Auto-created fix task for ${job.job_name} (${job.status})`
          })
        } catch {
          // Ignore log errors
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: created > 0
        ? `Created ${created} task${created !== 1 ? 's' : ''} for fixing unhealthy jobs`
        : 'No new tasks created (all already have fix tasks)',
      created,
      skipped,
      createdTasks,
      skippedTasks,
      totalUnhealthy: unhealthyJobs.length
    })

  } catch (error: any) {
    console.error('Jobs fix API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/jobs/fix - Preview what tasks would be created
export async function GET() {
  try {
    const supabase = createServerClient()

    // Fetch all unhealthy jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('dashboard_job_status')
      .select('*')
      .neq('status', 'healthy')
      .order('status', { ascending: true })

    if (jobsError) {
      return NextResponse.json({ error: jobsError.message }, { status: 500 })
    }

    const unhealthyJobs = (jobs || []) as JobStatus[]

    // Check for existing fix tasks
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('title')
      .like('title', 'Fix:%')
      .in('status', ['pending', 'pending_input', 'in_progress', 'blocked', 'scheduled'])

    const existingTitles = new Set((existingTasks || []).map(t => t.title))

    const preview = unhealthyJobs.map(job => {
      const businessLabel = job.business || 'infra'
      const taskTitle = `Fix: ${job.job_name} (${businessLabel})`
      return {
        job_name: job.job_name,
        business: job.business,
        status: job.status,
        taskTitle,
        wouldCreate: !existingTitles.has(taskTitle),
        existingTask: existingTitles.has(taskTitle)
      }
    })

    return NextResponse.json({
      totalUnhealthy: unhealthyJobs.length,
      wouldCreate: preview.filter(p => p.wouldCreate).length,
      alreadyExist: preview.filter(p => p.existingTask).length,
      preview
    })

  } catch (error: any) {
    console.error('Jobs fix preview error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
