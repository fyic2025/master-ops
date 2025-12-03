#!/usr/bin/env npx tsx
/**
 * Deploy BOO Stock Sync Workflow to n8n
 *
 * This creates and deploys a workflow that syncs supplier stock at 8 AM and 8 PM AEST daily
 *
 * The workflow triggers a webhook that runs the local sync scripts via the ops dashboard API
 */

import 'dotenv/config'

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZmJmYmQ0ZS1lYmUxLTQzMzMtYjNkMi01ZWFkYThiNzI2NDQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYzODUyMDAxfQ.sncjYpQTtaeK9t1cssVSv0GrMdm4kJ8ei4hYS9y4dq8'
const N8N_URL = 'https://automation.growthcohq.com'

// Schedule: 8 AM and 8 PM AEST (Sydney timezone)
// AEST is UTC+10, AEDT is UTC+11
// 8 AM AEST = 22:00 UTC (previous day) or 21:00 UTC during daylight saving
// 8 PM AEST = 10:00 UTC or 09:00 UTC during daylight saving
// Using cron expressions with UTC times for n8n

const workflow = {
  name: "BOO - Supplier Stock Sync (8am & 8pm AEST)",
  nodes: [
    {
      parameters: {
        rule: {
          interval: [
            {
              field: "cronExpression",
              expression: "0 21 * * *"  // 21:00 UTC = 8:00 AM AEDT (during daylight saving)
            }
          ]
        }
      },
      id: "morning-trigger",
      name: "8AM AEST Trigger",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [240, 300]
    },
    {
      parameters: {
        rule: {
          interval: [
            {
              field: "cronExpression",
              expression: "0 9 * * *"  // 09:00 UTC = 8:00 PM AEDT (during daylight saving)
            }
          ]
        }
      },
      id: "evening-trigger",
      name: "8PM AEST Trigger",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [240, 480]
    },
    {
      parameters: {},
      id: "manual-trigger",
      name: "Manual Trigger",
      type: "n8n-nodes-base.manualTrigger",
      typeVersion: 1,
      position: [240, 660]
    },
    {
      parameters: {
        jsCode: `// Initialize sync
const timestamp = new Date().toISOString();
console.log('Starting BOO Supplier Stock Sync at ' + timestamp);

return [{
  json: {
    startTime: timestamp,
    status: 'starting',
    suppliers: ['uhp', 'kadac', 'oborne', 'unleashed']
  }
}];`
      },
      id: "init",
      name: "Initialize Sync",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [480, 480]
    },
    {
      parameters: {
        method: "POST",
        url: "https://ops.growthcohq.com/api/jobs/sync",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Content-Type", value: "application/json" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: JSON.stringify({
          jobName: "stock-sync"
        }),
        options: {
          timeout: 300000  // 5 minute timeout for the sync
        }
      },
      id: "trigger-sync",
      name: "Trigger Stock Sync API",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [720, 480],
      continueOnFail: true
    },
    {
      parameters: {
        jsCode: `// Process sync result
const input = $input.first().json;
const startTime = $('Initialize Sync').first().json.startTime;
const endTime = new Date().toISOString();
const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;

// Check if the API call was successful
const success = input.statusCode >= 200 && input.statusCode < 300;

console.log('=== BOO Stock Sync Complete ===');
console.log('Status:', success ? 'SUCCESS' : 'FAILED');
console.log('Duration:', duration.toFixed(1) + 's');
console.log('Completed:', endTime);

return [{
  json: {
    status: success ? 'success' : 'failed',
    startTime: startTime,
    completedAt: endTime,
    duration: duration.toFixed(1) + 's',
    response: input
  }
}];`
      },
      id: "process-result",
      name: "Process Result",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [960, 480]
    },
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict"
          },
          conditions: [
            {
              id: "check-success",
              leftValue: "={{ $json.status }}",
              rightValue: "success",
              operator: {
                type: "string",
                operation: "equals"
              }
            }
          ],
          combinator: "and"
        },
        options: {}
      },
      id: "check-status",
      name: "Check Status",
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [1200, 480]
    },
    {
      parameters: {
        jsCode: `// Log success
console.log('Stock sync completed successfully!');
return $input.all();`
      },
      id: "log-success",
      name: "Log Success",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1440, 380]
    },
    {
      parameters: {
        jsCode: `// Log failure and prepare alert
console.log('Stock sync FAILED!');
console.log('Error details:', JSON.stringify($input.first().json, null, 2));
return $input.all();`
      },
      id: "log-failure",
      name: "Log Failure",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1440, 580]
    }
  ],
  connections: {
    "8AM AEST Trigger": {
      main: [[{ node: "Initialize Sync", type: "main", index: 0 }]]
    },
    "8PM AEST Trigger": {
      main: [[{ node: "Initialize Sync", type: "main", index: 0 }]]
    },
    "Manual Trigger": {
      main: [[{ node: "Initialize Sync", type: "main", index: 0 }]]
    },
    "Initialize Sync": {
      main: [[{ node: "Trigger Stock Sync API", type: "main", index: 0 }]]
    },
    "Trigger Stock Sync API": {
      main: [[{ node: "Process Result", type: "main", index: 0 }]]
    },
    "Process Result": {
      main: [[{ node: "Check Status", type: "main", index: 0 }]]
    },
    "Check Status": {
      main: [
        [{ node: "Log Success", type: "main", index: 0 }],
        [{ node: "Log Failure", type: "main", index: 0 }]
      ]
    }
  },
  settings: {
    executionOrder: "v1",
    saveManualExecutions: true,
    saveDataErrorExecution: "all",
    saveDataSuccessExecution: "all"
  }
}

async function deploy() {
  console.log('Deploying BOO Stock Sync workflow to n8n...\n')

  try {
    // Create the workflow
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
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    })

    if (activateResponse.ok) {
      console.log('Workflow activated!')
    } else {
      console.log('Warning: Could not activate workflow. Activate manually in n8n.')
    }

    console.log('\n=== Deployment Complete ===')
    console.log(`Workflow URL: ${N8N_URL}/workflow/${result.id}`)
    console.log('Schedule:')
    console.log('  - 8:00 AM AEST daily (21:00 UTC)')
    console.log('  - 8:00 PM AEST daily (09:00 UTC)')

    return result.id

  } catch (error) {
    console.error('Deployment failed:', error)
    process.exit(1)
  }
}

deploy()
