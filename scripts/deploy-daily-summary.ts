#!/usr/bin/env npx tsx
/**
 * Deploy Daily Operations Summary Workflow to n8n
 * Runs daily at 9 AM AEST to generate operations health report
 */

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJmYmQ0ZS1lYmUxLTQzMzMtYjNkMi01ZWFkYThiNzI2NDQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYzODUyMDAxfQ.sncjYpQTtaeK9t1cssVSv0GrMdm4kJ8ei4hYS9y4dq8'
const N8N_URL = 'https://automation.growthcohq.com'

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

const compileCode = `const jobs = $input.first().json;
const now = new Date();
const date = now.toLocaleDateString("en-AU", {timeZone: "Australia/Sydney"});

const total = jobs.length;
const healthy = jobs.filter(j => j.status === "healthy").length;
const stale = jobs.filter(j => j.status === "stale").length;
const failed = jobs.filter(j => j.status === "failed").length;
const unknown = jobs.filter(j => j.status === "unknown").length;
const healthPct = total > 0 ? Math.round(100 * healthy / total) : 0;

const byBusiness = {};
for (const job of jobs) {
  const biz = job.business || "infrastructure";
  if (!byBusiness[biz]) byBusiness[biz] = {healthy: 0, total: 0, issues: []};
  byBusiness[biz].total++;
  if (job.status === "healthy") byBusiness[biz].healthy++;
  else byBusiness[biz].issues.push(job.job_name + " (" + job.status + ")");
}

let summaryText = "Daily Operations Summary - " + date + "\\n\\n";
summaryText += "Overall Health: " + healthPct + "% (" + healthy + "/" + total + " jobs healthy)\\n";
summaryText += "Status: " + healthy + " healthy | " + stale + " stale | " + failed + " failed | " + unknown + " unknown\\n\\n";

for (const [biz, data] of Object.entries(byBusiness)) {
  const bizPct = Math.round(100 * data.healthy / data.total);
  summaryText += biz.toUpperCase() + ": " + bizPct + "% (" + data.healthy + "/" + data.total + ")\\n";
  if (data.issues.length > 0) {
    summaryText += "  Issues: " + data.issues.join(", ") + "\\n";
  }
}

console.log(summaryText);

return [{
  json: {
    report_date: now.toISOString().split("T")[0],
    health_percentage: healthPct,
    total_jobs: total,
    healthy_jobs: healthy,
    stale_jobs: stale,
    failed_jobs: failed,
    unknown_jobs: unknown,
    by_business: byBusiness,
    summary_text: summaryText,
    generated_at: now.toISOString()
  }
}];`

const completeCode = `const report = $('Compile Summary').first().json;
console.log("=== Daily Operations Summary Complete ===");
console.log(report.summary_text);

return [{json: {status: "success", report_date: report.report_date, health_percentage: report.health_percentage}}];`

const workflow = {
  name: "Infrastructure - Daily Operations Summary (9AM AEST)",
  nodes: [
    {
      parameters: {
        rule: {
          interval: [{ field: "cronExpression", expression: "0 23 * * *" }] // 23:00 UTC = 9:00 AM AEST
        }
      },
      id: "schedule",
      name: "Daily 9AM AEST",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [240, 300]
    },
    {
      parameters: {},
      id: "manual",
      name: "Manual Trigger",
      type: "n8n-nodes-base.manualTrigger",
      typeVersion: 1,
      position: [240, 480]
    },
    {
      parameters: {
        url: `${SUPABASE_URL}/rest/v1/dashboard_job_status?select=*`,
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "apikey", value: SUPABASE_SERVICE_KEY },
            { name: "Authorization", value: `Bearer ${SUPABASE_SERVICE_KEY}` }
          ]
        },
        options: { timeout: 30000 }
      },
      id: "fetch-jobs",
      name: "Fetch Job Statuses",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [480, 380]
    },
    {
      parameters: {
        jsCode: compileCode
      },
      id: "compile",
      name: "Compile Summary",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [720, 380]
    },
    {
      parameters: {
        jsCode: completeCode
      },
      id: "complete",
      name: "Complete",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [960, 380]
    }
  ],
  connections: {
    "Daily 9AM AEST": { main: [[{ node: "Fetch Job Statuses", type: "main", index: 0 }]] },
    "Manual Trigger": { main: [[{ node: "Fetch Job Statuses", type: "main", index: 0 }]] },
    "Fetch Job Statuses": { main: [[{ node: "Compile Summary", type: "main", index: 0 }]] },
    "Compile Summary": { main: [[{ node: "Complete", type: "main", index: 0 }]] }
  },
  settings: {
    executionOrder: "v1",
    saveManualExecutions: true,
    saveDataErrorExecution: "all",
    saveDataSuccessExecution: "all"
  }
}

async function deploy() {
  console.log('Deploying Daily Operations Summary workflow to n8n...\n')

  try {
    const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflow)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create workflow: ${response.status} - ${error}`)
    }

    const result = await response.json()
    console.log(`Workflow created successfully!`)
    console.log(`ID: ${result.id}`)
    console.log(`URL: ${N8N_URL}/workflow/${result.id}`)

    // Activate the workflow
    console.log('\nActivating workflow...')
    const activateResponse = await fetch(`${N8N_URL}/api/v1/workflows/${result.id}/activate`, {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    })

    if (activateResponse.ok) {
      console.log('Workflow activated!')
    } else {
      console.log('Warning: Could not activate. Activate manually in n8n.')
    }

    // Test execution
    console.log('\nTriggering test execution...')
    const execResponse = await fetch(`${N8N_URL}/api/v1/workflows/${result.id}/execute`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (execResponse.ok) {
      const execResult = await execResponse.json()
      console.log(`Execution started! ID: ${execResult.data?.executionId || 'N/A'}`)
    } else {
      console.log('Could not trigger execution. Run manually in n8n.')
    }

    console.log('\n=== Deployment Complete ===')
    console.log(`Workflow URL: ${N8N_URL}/workflow/${result.id}`)
    console.log('Schedule: Daily at 9:00 AM AEST (23:00 UTC)')

    return result.id

  } catch (error) {
    console.error('Deployment failed:', error)
    process.exit(1)
  }
}

deploy()
