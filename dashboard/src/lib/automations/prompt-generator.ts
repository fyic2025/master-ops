// Prompt Generator for Copy-to-Claude Feature
// Generates comprehensive prompts for automation testing and execution

import type { AutomationDefinition, AutomationInstance, AutomationStats, QueueStatus, ExecutionLog } from './types'

interface PromptContext {
  definition: AutomationDefinition
  instance: AutomationInstance
  stats?: AutomationStats
  queue?: QueueStatus
  recentLogs?: ExecutionLog[]
  pool?: { total: number; available: number }
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toISOString()
}

export function generateClaudePrompt(context: PromptContext): string {
  const { definition, instance, stats, queue, recentLogs, pool } = context
  const now = new Date()

  // Calculate remaining capacity
  const dailyLimit = (instance.config.daily_limit as number) || 50
  const sentToday = stats?.sent_today || 0
  const remaining = Math.max(0, dailyLimit - sentToday)

  // Build the prompt
  const prompt = `## Email Automation Execution Request

**Automation**: ${definition.name} (${definition.slug})
**Business**: ${instance.business.toUpperCase()}
**Status**: ${instance.enabled ? 'ENABLED' : 'DISABLED'}
**Health**: ${instance.health_status.toUpperCase()}
**Last Run**: ${formatDate(instance.last_run_at)} (${formatRelativeTime(instance.last_run_at)})
**Requested at**: ${now.toISOString()}

---

### Required Skills
Execute these skill activations before proceeding:
\`\`\`
/skill email-campaign-manager
/skill integration-tester
/skill supabase-expert
\`\`\`

---

### Current Context

\`\`\`json
${JSON.stringify({
  automation: {
    type: definition.slug,
    enabled: instance.enabled,
    config: instance.config,
  },
  stats: stats ? {
    total_sent: stats.total_sent,
    total_opened: stats.total_opened,
    total_clicked: stats.total_clicked,
    total_converted: stats.total_converted,
    total_revenue: stats.total_revenue,
    sent_today: stats.sent_today,
    daily_limit: dailyLimit,
    open_rate_percent: stats.open_rate_percent,
    click_rate_percent: stats.click_rate_percent,
    conversion_rate_percent: stats.conversion_rate_percent,
  } : null,
  queue: queue ? {
    date: queue.date,
    pending: queue.pending,
    sent: queue.sent,
    failed: queue.failed,
    total: queue.total,
  } : null,
  last_run: {
    timestamp: instance.last_run_at,
    result: instance.last_run_result,
  },
  pool: pool || null,
}, null, 2)}
\`\`\`

---

### Rate Limits

| Type | Limit | Used | Remaining |
|------|-------|------|-----------|
| Daily Emails | ${dailyLimit} | ${sentToday} | ${remaining} |
| Send Window | ${instance.config.send_window_start || 9}AM-${instance.config.send_window_end || 19}:00 AEST | - | Check current Melbourne time |

---

### Script Files

- **Process Script**: \`${definition.processScript || 'N/A'}\`
- **Queue Script**: \`${definition.queueScript || 'N/A'}\`
- **Config Table**: \`${definition.configTable}\`
- **Queue Table**: \`${definition.queueTable || 'N/A'}\`
- **Stats View**: \`${definition.statsView || 'N/A'}\`

**Relevant Files**:
${definition.relevantFiles.map(f => `- \`${f}\``).join('\n')}

---

### Testing Protocol

Execute the 8-phase integration testing methodology:

**Phase 1: Environment Validation**
\`\`\`bash
node creds.js get ${instance.business} gmail_client_id
node creds.js get ${instance.business} gmail_client_secret
node creds.js get ${instance.business} gmail_refresh_token
${definition.slug === 'anniversary_upsell' ? 'node creds.js get teelixir shopify_access_token' : ''}
\`\`\`

**Phase 2: Database Connection**
- Verify Supabase connection
- Query \`${definition.configTable}\` for current settings
- Verify enabled=${instance.enabled}

**Phase 3: Gmail OAuth Test**
- Attempt token refresh
- Verify sender email (${instance.config.sender_email || 'N/A'}) is authorized

**Phase 4: Rate Limit Check**
- Confirm sent_today (${sentToday}) < daily_limit (${dailyLimit})
- Remaining capacity: ${remaining} emails

**Phase 5: Queue Status**
- Pending: ${queue?.pending || 0}
- Check for stuck/failed items

**Phase 6: Dry Run**
\`\`\`bash
npx tsx ${definition.processScript} --dry-run
\`\`\`

**Phase 7: Test Email**
\`\`\`bash
npx tsx ${definition.processScript} --test-email=jayson@fyic.com.au --test-name="Jayson"
\`\`\`

**Phase 8: Process Queue** (if tests pass)
\`\`\`bash
npx tsx ${definition.processScript} --process-queue
\`\`\`

---

${recentLogs && recentLogs.length > 0 ? `### Recent Execution History

| Time | Type | Success | Processed | Failed |
|------|------|---------|-----------|--------|
${recentLogs.slice(0, 5).map(log =>
  `| ${formatRelativeTime(log.started_at)} | ${log.execution_type} | ${log.success ? 'YES' : 'NO'} | ${log.items_processed} | ${log.items_failed} |`
).join('\n')}

---

` : ''}### Quick Commands Reference

\`\`\`bash
# Dry run (safe - no emails sent)
npx tsx ${definition.processScript} --dry-run

# Test email to admin
npx tsx ${definition.processScript} --test-email=jayson@fyic.com.au

# Process current hour's queue
npx tsx ${definition.processScript} --process-queue

# With explicit limit
npx tsx ${definition.processScript} --process-queue --limit=5
${definition.queueScript ? `
# Queue tomorrow's batch
npx tsx ${definition.queueScript}
` : ''}
\`\`\`

---

### Report Back With

After execution, provide a structured report including:

1. **Test Results Summary**: Pass/fail status for each of 8 phases
2. **Execution Summary**:
   - Emails sent vs failed
   - Duration
   - Current hour processed
3. **Database Updates**:
   - Queue records updated (pending → sent)
   - New records in logging table
4. **Errors Encountered**: Full error messages with proposed solutions
5. **Recommendations**: Any configuration changes needed
6. **Next Steps**: Actions to take (e.g., "Enable automation", "Schedule next run")

---

**Dashboard Link**: https://ops.growthcohq.com/${instance.business}/automations/${definition.slug}
`

  return prompt.trim()
}

// Shorter version for quick copy
export function generateQuickPrompt(context: PromptContext): string {
  const { definition, instance, stats, queue } = context

  return `Run ${definition.name} automation for ${instance.business.toUpperCase()}.

Status: ${instance.enabled ? 'ENABLED' : 'DISABLED'}, Last run: ${formatRelativeTime(instance.last_run_at)}
Queue: ${queue?.pending || 0} pending, ${stats?.sent_today || 0}/${instance.config.daily_limit || 50} sent today

Scripts:
- Process: npx tsx ${definition.processScript} --process-queue
- Dry run: npx tsx ${definition.processScript} --dry-run

/skill email-campaign-manager
/skill integration-tester

Validate credentials, run dry-run, then process queue if tests pass.`
}
