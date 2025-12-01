# Job Monitoring Widget - Future Enhancements

## Current Implementation (Dec 1, 2025)
- Shows job count and health percentage on home dashboard
- Click to expand modal with all job details
- Copy button generates fix command for Claude Code
- Refresh button to re-check statuses
- 22 jobs tracked across all businesses

## Future Enhancements

### 1. Add n8n Workflow ID
- Store `n8n_workflow_id` in `dashboard_job_status` table
- Generate direct link to n8n dashboard: `https://automation.growthcohq.com/workflow/{id}`
- Include in copy command for faster access

### 2. Capture Last Error Message
- When jobs fail, store the error message
- Display in the job card UI
- Include in copy command for context

### 3. Link to Execution History
- For n8n jobs: Link to `https://automation.growthcohq.com/executions?workflowId={id}`
- For cron jobs: Link to relevant log tables
- For edge functions: Link to Supabase function logs

### 4. Auto-Update from Actual Sources
- Poll BOO `automation_logs` table for cron job status
- Query n8n API for workflow execution history
- Check Supabase edge function invocations

### 5. Slack/Email Alerts
- Notify when job health drops below threshold
- Daily summary of job statuses
- Immediate alert on job failures

### 6. Historical Trend
- Track job health over time
- Show sparkline of success/failure trend
- Identify patterns in failures

## Database Schema Additions (when implementing)

```sql
-- Add to dashboard_job_status table:
ALTER TABLE dashboard_job_status ADD COLUMN n8n_workflow_id TEXT;
ALTER TABLE dashboard_job_status ADD COLUMN execution_history_url TEXT;
ALTER TABLE dashboard_job_status ADD COLUMN last_error_details JSONB;
```

## Related Files
- `dashboard/src/components/JobMonitoringWidget.tsx`
- `dashboard/src/app/api/jobs/route.ts`
- `infra/supabase/migrations/20251201_job_monitoring.sql`
