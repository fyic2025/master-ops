#!/usr/bin/env node
/**
 * Local Automation Runner
 * =======================
 * Runs automation scripts that require Node.js network access.
 * Schedule this with Windows Task Scheduler or run manually.
 *
 * Usage:
 *   node scripts/local-automation-runner.js [command]
 *
 * Commands:
 *   all              - Run all due automations
 *   tlx-klaviyo      - Sync Klaviyo unengaged
 *   tlx-winback      - Send winback emails
 *   tlx-reconcile    - Reconcile winback conversions
 *   tlx-anniversary  - Send anniversary emails
 *   boo-stock        - Sync BOO supplier stock
 *   status           - Show automation status
 *   schedule         - Show what's due to run
 *
 * Environment:
 *   Loads .env from project root
 *   Uses creds.js for vault access
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PROJECT_ROOT = path.join(__dirname, '..');

// =============================================================================
// AUTOMATION DEFINITIONS
// =============================================================================

const AUTOMATIONS = {
  'tlx-klaviyo': {
    name: 'Teelixir Klaviyo Unengaged Sync',
    script: 'teelixir/scripts/sync-klaviyo-unengaged.ts',
    schedule: 'weekly', // Sunday
    business: 'teelixir',
    jobName: 'klaviyo-unengaged-sync'
  },
  'tlx-winback': {
    name: 'Teelixir Winback Emails',
    script: 'teelixir/scripts/send-winback-emails.ts',
    schedule: 'daily',
    business: 'teelixir',
    jobName: 'winback-emails'
  },
  'tlx-reconcile': {
    name: 'Teelixir Winback Reconciliation',
    script: 'teelixir/scripts/reconcile-winback-conversions.ts',
    schedule: 'daily',
    business: 'teelixir',
    jobName: 'winback-reconcile'
  },
  'tlx-anniversary': {
    name: 'Teelixir Anniversary Emails',
    script: 'teelixir/scripts/send-anniversary-emails.ts',
    schedule: 'daily',
    business: 'teelixir',
    jobName: 'anniversary-emails'
  },
  'tlx-products': {
    name: 'Teelixir Products Sync',
    script: 'teelixir/scripts/sync-teelixir-products.ts',
    schedule: 'weekly',
    business: 'teelixir',
    jobName: 'teelixir-products-sync'
  },
  'tlx-orders': {
    name: 'Teelixir Distributor Orders Sync',
    script: 'teelixir/scripts/sync-distributor-orders.ts',
    schedule: 'daily',
    business: 'teelixir',
    jobName: 'teelixir-order-sync'
  },
  'boo-stock': {
    name: 'BOO Supplier Stock Sync',
    script: 'buy-organics-online/sync-all-suppliers.js',
    schedule: 'twice-daily', // 8am and 8pm
    business: 'boo',
    jobName: 'stock-sync'
  }
};

// =============================================================================
// RUNNER
// =============================================================================

async function runScript(scriptPath, args = []) {
  const fullPath = path.join(PROJECT_ROOT, scriptPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Script not found: ${fullPath}`);
  }

  const ext = path.extname(scriptPath);
  let command, cmdArgs;

  if (ext === '.ts') {
    command = 'npx';
    cmdArgs = ['tsx', fullPath, ...args];
  } else {
    command = 'node';
    cmdArgs = [fullPath, ...args];
  }

  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${cmdArgs.join(' ')}`);

    const proc = spawn(command, cmdArgs, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, code });
      } else {
        resolve({ success: false, code });
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function updateJobStatus(jobName, business, success, errorMessage = null) {
  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = process.env.SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseKey) {
    console.log('Warning: SUPABASE_SERVICE_KEY not set, skipping job status update');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const update = {
    last_run_at: new Date().toISOString(),
    status: success ? 'healthy' : 'failed',
    error_message: errorMessage
  };

  if (success) {
    update.last_success_at = update.last_run_at;
  }

  const { error } = await supabase
    .from('dashboard_job_status')
    .update(update)
    .eq('job_name', jobName)
    .eq('business', business);

  if (error) {
    console.log(`Warning: Failed to update job status: ${error.message}`);
  } else {
    console.log(`Updated job status: ${jobName} = ${update.status}`);
  }
}

async function runAutomation(key) {
  const automation = AUTOMATIONS[key];
  if (!automation) {
    console.error(`Unknown automation: ${key}`);
    console.log('Available:', Object.keys(AUTOMATIONS).join(', '));
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${automation.name}`);
  console.log(`${'='.repeat(60)}\n`);

  const startTime = Date.now();

  try {
    const result = await runScript(automation.script);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result.success) {
      console.log(`\n✓ ${automation.name} completed in ${duration}s`);
      await updateJobStatus(automation.jobName, automation.business, true);
    } else {
      console.log(`\n✗ ${automation.name} failed (exit code: ${result.code})`);
      await updateJobStatus(automation.jobName, automation.business, false, `Exit code: ${result.code}`);
    }

    return result;
  } catch (err) {
    console.error(`\n✗ ${automation.name} error: ${err.message}`);
    await updateJobStatus(automation.jobName, automation.business, false, err.message);
    return { success: false, error: err.message };
  }
}

async function runAllDue() {
  const day = new Date().getDay(); // 0 = Sunday
  const hour = new Date().getHours();

  const toRun = [];

  for (const [key, auto] of Object.entries(AUTOMATIONS)) {
    switch (auto.schedule) {
      case 'daily':
        toRun.push(key);
        break;
      case 'weekly':
        if (day === 0) toRun.push(key); // Sunday
        break;
      case 'twice-daily':
        if (hour === 8 || hour === 20) toRun.push(key);
        break;
    }
  }

  console.log(`Automations due to run: ${toRun.length > 0 ? toRun.join(', ') : 'none'}`);

  const results = {};
  for (const key of toRun) {
    results[key] = await runAutomation(key);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  for (const [key, result] of Object.entries(results)) {
    const status = result.success ? '✓' : '✗';
    console.log(`${status} ${AUTOMATIONS[key].name}`);
  }
}

function showStatus() {
  console.log('\nAutomation Status');
  console.log('=================\n');

  for (const [key, auto] of Object.entries(AUTOMATIONS)) {
    const scriptExists = fs.existsSync(path.join(PROJECT_ROOT, auto.script));
    const status = scriptExists ? '✓' : '✗';
    console.log(`${status} ${key.padEnd(20)} ${auto.name}`);
    console.log(`  Script: ${auto.script}`);
    console.log(`  Schedule: ${auto.schedule}`);
    console.log('');
  }
}

function showSchedule() {
  const day = new Date().getDay();
  const hour = new Date().getHours();

  console.log('\nSchedule');
  console.log('========\n');
  console.log(`Current: ${new Date().toLocaleString()} (Day ${day}, Hour ${hour})\n`);

  const categories = {
    'Daily': [],
    'Weekly (Sunday)': [],
    'Twice Daily (8am/8pm)': []
  };

  for (const [key, auto] of Object.entries(AUTOMATIONS)) {
    switch (auto.schedule) {
      case 'daily':
        categories['Daily'].push(key);
        break;
      case 'weekly':
        categories['Weekly (Sunday)'].push(key);
        break;
      case 'twice-daily':
        categories['Twice Daily (8am/8pm)'].push(key);
        break;
    }
  }

  for (const [cat, keys] of Object.entries(categories)) {
    if (keys.length > 0) {
      console.log(`${cat}:`);
      keys.forEach(k => console.log(`  - ${k}`));
      console.log('');
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

const command = process.argv[2] || 'status';

switch (command) {
  case 'all':
    runAllDue().catch(console.error);
    break;
  case 'status':
    showStatus();
    break;
  case 'schedule':
    showSchedule();
    break;
  default:
    if (AUTOMATIONS[command]) {
      runAutomation(command).catch(console.error);
    } else {
      console.log('Local Automation Runner');
      console.log('=======================\n');
      console.log('Usage: node scripts/local-automation-runner.js [command]\n');
      console.log('Commands:');
      console.log('  all              Run all due automations');
      console.log('  status           Show automation status');
      console.log('  schedule         Show what runs when\n');
      console.log('Automations:');
      for (const key of Object.keys(AUTOMATIONS)) {
        console.log(`  ${key.padEnd(18)} ${AUTOMATIONS[key].name}`);
      }
    }
}
