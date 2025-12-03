/**
 * Import workflow to n8n
 */

const creds = require('../creds');
const fs = require('fs');
const path = require('path');

async function run() {
  const workflowFile = process.argv[2];

  if (!workflowFile) {
    console.log('Usage: node import-n8n-workflow.js <workflow-file.json>');
    process.exit(1);
  }

  await creds.load('home');

  const n8nUrl = process.env.N8N_BASE_URL || 'https://automation.growthcohq.com';
  const n8nKey = process.env.N8N_API_KEY;

  if (!n8nKey) {
    console.log('Error: N8N_API_KEY not found in credentials');
    process.exit(1);
  }

  // Read workflow
  const filePath = path.resolve(workflowFile);
  const rawWorkflow = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Strip fields not accepted by n8n API
  const workflow = {
    name: rawWorkflow.name,
    nodes: rawWorkflow.nodes,
    connections: rawWorkflow.connections,
    settings: rawWorkflow.settings,
  };

  console.log('Importing workflow:', workflow.name);
  console.log('To:', n8nUrl);

  const response = await fetch(n8nUrl + '/api/v1/workflows', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': n8nKey,
    },
    body: JSON.stringify(workflow),
  });

  const result = await response.json();

  if (response.ok) {
    console.log('');
    console.log('Workflow imported successfully!');
    console.log('ID:', result.id);
    console.log('URL:', n8nUrl + '/workflow/' + result.id);
    console.log('');
    console.log('NOTE: Workflow is INACTIVE. Activate it in n8n when ready.');
  } else {
    console.log('Error:', response.status);
    console.log(JSON.stringify(result, null, 2));
  }
}

run().catch(console.error);
