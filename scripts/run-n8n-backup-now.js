#!/usr/bin/env node
/**
 * Run n8n Backup to Supabase - Manual Execution
 * This script manually backs up all n8n workflows and executions to Supabase.
 * Use this for testing or to run backup outside of the scheduled n8n workflow.
 *
 * Usage: node scripts/run-n8n-backup-now.js
 */

const https = require('https');
const crypto = require('crypto');

// Configuration
const N8N_URL = 'automation.growthcohq.com';
const SUPABASE_HOST = 'usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';
const ENCRYPTION_KEY = 'mstr-ops-vault-2024-secure-key';

// Decrypt credential from vault
function decrypt(encryptedValue) {
  const buffer = Buffer.from(encryptedValue, 'base64');
  const iv = buffer.subarray(0, 16);
  const encrypted = buffer.subarray(16);
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

// HTTP request helper
function request(hostname, path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path,
      method,
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function getN8nApiKey() {
  const res = await request(
    SUPABASE_HOST,
    '/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value',
    'GET',
    null,
    { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  );
  if (res.data && res.data[0]?.encrypted_value) {
    return decrypt(res.data[0].encrypted_value);
  }
  throw new Error('Could not retrieve n8n API key');
}

async function getWorkflows(apiKey) {
  const res = await request(
    N8N_URL,
    '/api/v1/workflows',
    'GET',
    null,
    { 'X-N8N-API-KEY': apiKey }
  );
  return res.data?.data || [];
}

async function getExecutions(apiKey) {
  const res = await request(
    N8N_URL,
    '/api/v1/executions?limit=500',
    'GET',
    null,
    { 'X-N8N-API-KEY': apiKey }
  );
  return res.data?.data || [];
}

async function upsertWorkflows(workflows) {
  const processed = workflows.map(w => {
    const defHash = crypto.createHash('md5')
      .update(JSON.stringify(w.nodes || []))
      .digest('hex');

    let triggerType = 'manual';
    const triggerNode = (w.nodes || []).find(n =>
      n.type?.includes('Trigger') ||
      n.type?.includes('webhook') ||
      n.type?.includes('schedule')
    );
    if (triggerNode) {
      if (triggerNode.type.includes('webhook')) triggerType = 'webhook';
      else if (triggerNode.type.includes('schedule')) triggerType = 'schedule';
      else triggerType = triggerNode.type.split('.').pop() || 'manual';
    }

    return {
      n8n_workflow_id: w.id,
      name: w.name,
      active: w.active || false,
      is_archived: w.isArchived || false,
      created_at_n8n: w.createdAt,
      updated_at_n8n: w.updatedAt,
      workflow_definition: {
        nodes: w.nodes,
        connections: w.connections,
        settings: w.settings
      },
      node_count: (w.nodes || []).length,
      trigger_type: triggerType,
      tags: (w.tags || []).map(t => t.name || t),
      definition_hash: defHash,
      last_backed_up_at: new Date().toISOString()
    };
  });

  const res = await request(
    SUPABASE_HOST,
    '/rest/v1/n8n_workflows',
    'POST',
    processed,
    {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    }
  );
  return { count: processed.length, status: res.status };
}

async function upsertExecutions(executions) {
  const processed = executions.map(e => {
    let errorMessage = null;
    let errorNode = null;
    let errorType = null;

    if (e.data?.resultData?.error) {
      const err = e.data.resultData.error;
      errorMessage = (err.message || String(err)).substring(0, 2000);
      errorNode = err.node?.name || null;

      if (errorMessage.includes('timeout')) errorType = 'timeout';
      else if (errorMessage.includes('ECONNREFUSED')) errorType = 'connection';
      else if (errorMessage.includes('401') || errorMessage.includes('403')) errorType = 'auth';
      else if (errorMessage.includes('500')) errorType = 'server_error';
      else errorType = 'unknown';
    }

    const startedAt = e.startedAt ? new Date(e.startedAt) : null;
    const finishedAt = e.stoppedAt ? new Date(e.stoppedAt) : null;
    const durationMs = (startedAt && finishedAt) ? finishedAt - startedAt : null;

    return {
      n8n_execution_id: String(e.id),
      n8n_workflow_id: e.workflowId,
      workflow_name: e.workflowData?.name || 'Unknown',
      status: e.status || (e.finished ? 'success' : 'running'),
      mode: e.mode || 'manual',
      started_at: e.startedAt,
      finished_at: e.stoppedAt,
      duration_ms: durationMs,
      has_error: e.status === 'error' || !!errorMessage,
      error_message: errorMessage,
      error_node: errorNode,
      error_type: errorType,
      nodes_executed: Object.keys(e.data?.resultData?.runData || {}).length,
      nodes_failed: 0,
      backed_up_at: new Date().toISOString()
    };
  });

  const res = await request(
    SUPABASE_HOST,
    '/rest/v1/n8n_executions',
    'POST',
    processed,
    {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    }
  );
  return { count: processed.length, errors: processed.filter(p => p.has_error).length, status: res.status };
}

async function logBackupRun(stats) {
  await request(
    SUPABASE_HOST,
    '/rest/v1/n8n_backup_runs',
    'POST',
    {
      finished_at: new Date().toISOString(),
      status: 'success',
      workflows_backed_up: stats.workflows,
      executions_backed_up: stats.executions,
      errors_found: stats.errors,
      details: stats
    },
    {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  );
}

async function main() {
  console.log('='.repeat(60));
  console.log('📦 n8n BACKUP TO SUPABASE');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Get n8n API key
    console.log('🔑 Getting n8n API key from vault...');
    const apiKey = await getN8nApiKey();
    console.log('  ✅ Got API key');

    // Get workflows
    console.log('');
    console.log('📋 Fetching workflows from n8n...');
    const workflows = await getWorkflows(apiKey);
    console.log(`  Found ${workflows.length} workflows`);
    console.log(`  Active: ${workflows.filter(w => w.active).length}`);
    console.log(`  Archived: ${workflows.filter(w => w.isArchived).length}`);

    // Get executions
    console.log('');
    console.log('📊 Fetching executions from n8n...');
    const executions = await getExecutions(apiKey);
    console.log(`  Found ${executions.length} executions`);

    // Backup workflows
    console.log('');
    console.log('💾 Backing up workflows to Supabase...');
    const wfResult = await upsertWorkflows(workflows);
    console.log(`  ✅ Backed up ${wfResult.count} workflows (status: ${wfResult.status})`);

    // Backup executions
    console.log('');
    console.log('💾 Backing up executions to Supabase...');
    const exResult = await upsertExecutions(executions);
    console.log(`  ✅ Backed up ${exResult.count} executions (status: ${exResult.status})`);
    console.log(`  Errors found: ${exResult.errors}`);

    // Log backup run
    const stats = {
      workflows: wfResult.count,
      executions: exResult.count,
      errors: exResult.errors,
      timestamp: new Date().toISOString()
    };
    await logBackupRun(stats);

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ BACKUP COMPLETE');
    console.log('='.repeat(60));
    console.log(`Workflows: ${stats.workflows}`);
    console.log(`Executions: ${stats.executions}`);
    console.log(`Errors found: ${stats.errors}`);
    console.log('');

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

main();
