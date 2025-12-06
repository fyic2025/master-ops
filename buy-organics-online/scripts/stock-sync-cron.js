#!/usr/bin/env node

/**
 * STOCK SYNC CRON SCHEDULER
 *
 * Runs supplier stock sync at 8:00 AM and 8:00 PM AEST daily
 *
 * Workflow:
 * 1. Sync all supplier feeds to Supabase
 * 2. Update BigCommerce availability based on supplier stock
 *
 * Usage:
 *   node stock-sync-cron.js          # Run cron scheduler (stays running)
 *   node stock-sync-cron.js --now    # Run sync immediately and exit
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

// AEST timezone offset (+10:00 or +11:00 during DST)
// Using Australia/Sydney timezone which handles DST automatically
const TIMEZONE = 'Australia/Sydney';

// Cron schedules (AEST)
// 8:00 AM AEST
const MORNING_SCHEDULE = '0 8 * * *';
// 8:00 PM AEST
const EVENING_SCHEDULE = '0 20 * * *';

// Run a script and wait for completion
function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    console.log(`[${new Date().toISOString()}] Starting ${scriptName}...`);

    const child = spawn('node', [scriptPath], {
      cwd: __dirname,
      stdio: 'inherit',
      env: process.env
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[${new Date().toISOString()}] ${scriptName} completed successfully`);
        resolve(true);
      } else {
        console.error(`[${new Date().toISOString()}] ${scriptName} failed with code ${code}`);
        resolve(false);
      }
    });

    child.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] ${scriptName} error: ${err.message}`);
      resolve(false);
    });
  });
}

// Run update-bc-availability.js with --live flag
function runBCUpdate() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'update-bc-availability.js');
    console.log(`[${new Date().toISOString()}] Starting BC availability update...`);

    const child = spawn('node', [scriptPath, '--live'], {
      cwd: __dirname,
      stdio: 'inherit',
      env: process.env
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[${new Date().toISOString()}] BC update completed successfully`);
        resolve(true);
      } else {
        console.error(`[${new Date().toISOString()}] BC update failed with code ${code}`);
        resolve(false);
      }
    });

    child.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] BC update error: ${err.message}`);
      resolve(false);
    });
  });
}

// Main sync workflow
async function runFullSync() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║             SCHEDULED STOCK SYNC STARTING                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n[${new Date().toISOString()}] Starting scheduled sync...\n`);

  const startTime = Date.now();

  try {
    // Step 1: Sync all suppliers
    console.log('STEP 1/2: Syncing supplier feeds...\n');
    const supplierSyncOk = await runScript('sync-all-suppliers.js');

    if (!supplierSyncOk) {
      console.error('\n⚠️  Supplier sync failed, but continuing with BC update...\n');
    }

    // Step 2: Update BC availability
    console.log('\nSTEP 2/2: Updating BigCommerce availability...\n');
    const bcUpdateOk = await runBCUpdate();

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║             SCHEDULED SYNC COMPLETE                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n[${new Date().toISOString()}] Sync completed in ${duration} minutes`);
    console.log(`  Supplier sync: ${supplierSyncOk ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  BC update:     ${bcUpdateOk ? 'SUCCESS' : 'FAILED'}\n`);

    return supplierSyncOk && bcUpdateOk;

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Fatal error during sync: ${error.message}`);
    return false;
  }
}

// Start cron scheduler
function startScheduler() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         STOCK SYNC CRON SCHEDULER                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nStarted at: ${new Date().toISOString()}`);
  console.log(`Timezone: ${TIMEZONE}\n`);
  console.log('Scheduled jobs:');
  console.log(`  8:00 AM AEST daily - ${MORNING_SCHEDULE}`);
  console.log(`  8:00 PM AEST daily - ${EVENING_SCHEDULE}\n`);
  console.log('Waiting for next scheduled run...\n');
  console.log('Press Ctrl+C to stop.\n');

  // Schedule morning sync (8:00 AM AEST)
  cron.schedule(MORNING_SCHEDULE, async () => {
    console.log(`\n[CRON] Morning sync triggered (8:00 AM AEST)`);
    await runFullSync();
  }, {
    timezone: TIMEZONE
  });

  // Schedule evening sync (8:00 PM AEST)
  cron.schedule(EVENING_SCHEDULE, async () => {
    console.log(`\n[CRON] Evening sync triggered (8:00 PM AEST)`);
    await runFullSync();
  }, {
    timezone: TIMEZONE
  });

  // Keep process alive
  console.log('Scheduler is running. Waiting for scheduled jobs...');
}

// CLI handling
const args = process.argv.slice(2);

if (args.includes('--now') || args.includes('--run')) {
  // Run immediately
  console.log('Running sync immediately (--now flag)...\n');
  runFullSync().then(success => {
    process.exit(success ? 0 : 1);
  });
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Stock Sync Cron Scheduler

Usage:
  node stock-sync-cron.js          Start cron scheduler (runs 8am & 8pm AEST)
  node stock-sync-cron.js --now    Run sync immediately and exit
  node stock-sync-cron.js --help   Show this help

The scheduler runs two jobs daily:
  - 8:00 AM AEST: Sync all suppliers + update BC
  - 8:00 PM AEST: Sync all suppliers + update BC

To run as a service, consider using:
  - PM2: pm2 start stock-sync-cron.js --name "stock-sync"
  - systemd service (Linux)
  - Windows Task Scheduler
`);
} else {
  // Start cron scheduler
  startScheduler();
}
