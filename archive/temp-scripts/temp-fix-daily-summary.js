// Fix daily-summary workflow: update cron and handle array response
const workflowId = 'y3N1o5QIe7uoVpuW';

// Fixed nodes configuration
const fixedNodes = [
  {
    "parameters": {
      "rule": {
        "interval": [
          {
            "field": "cronExpression",
            "expression": "0 9 * * *"  // Fixed: was 0 23, now 0 9 for 9 AM Melbourne
          }
        ]
      }
    },
    "id": "schedule",
    "name": "Daily 9AM AEST",
    "type": "n8n-nodes-base.scheduleTrigger",
    "typeVersion": 1.2,
    "position": [240, 300]
  },
  {
    "parameters": {},
    "id": "manual",
    "name": "Manual Trigger",
    "type": "n8n-nodes-base.manualTrigger",
    "typeVersion": 1,
    "position": [240, 480]
  },
  {
    "parameters": {
      "url": "https://qcvfxxsnqvdfmpbcgdni.supabase.co/rest/v1/dashboard_job_status?select=*",
      "sendHeaders": true,
      "headerParameters": {
        "parameters": [
          {
            "name": "apikey",
            "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8"
          },
          {
            "name": "Authorization",
            "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8"
          }
        ]
      },
      "options": {
        "timeout": 30000
      }
    },
    "id": "fetch-jobs",
    "name": "Fetch Job Statuses",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [480, 380]
  },
  {
    "parameters": {
      "jsCode": `// Fixed: Handle both array and single-item responses from n8n HTTP node
const rawData = $input.first().json;
const jobs = Array.isArray(rawData) ? rawData : (rawData.data || [rawData]);

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
    },
    "id": "compile",
    "name": "Compile Summary",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [720, 380]
  },
  {
    "parameters": {
      "jsCode": `const report = $("Compile Summary").first().json;
console.log("=== Daily Operations Summary Complete ===");
console.log(report.summary_text);

return [{json: {status: "success", report_date: report.report_date, health_percentage: report.health_percentage}}];`
    },
    "id": "complete",
    "name": "Complete",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [960, 380]
  }
];

// Output for manual update
console.log("=== FIXED NODES JSON ===");
console.log(JSON.stringify(fixedNodes));
