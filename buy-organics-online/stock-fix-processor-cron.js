/**
 * Stock Fix Queue Processor - PM2 Cron Wrapper
 *
 * Runs the stock fix processor every 15 minutes.
 *
 * Architecture: Supabase-first pattern
 * - Dashboard queues actions to stock_fix_queue
 * - This processor executes them against BigCommerce API
 * - Results logged to stock_fix_log
 *
 * Usage:
 *   node stock-fix-processor-cron.js           # Start cron scheduler
 *   node stock-fix-processor-cron.js --now     # Run immediately
 *   node stock-fix-processor-cron.js --status  # Show queue status
 *
 * PM2:
 *   pm2 start stock-fix-processor-cron.js --name stock-fix-processor
 */

const cron = require('node-cron');
const path = require('path');
const { spawn } = require('child_process');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

// Configuration
const CONFIG = {
    schedule: '*/15 * * * *', // Every 15 minutes
    timezone: 'UTC',
};

// Run the TypeScript processor
function runProcessor() {
    return new Promise((resolve, reject) => {
        console.log(`\n[${new Date().toISOString()}] Running stock fix processor...`);

        const processorPath = path.resolve(__dirname, 'stock-fix-processor.ts');

        const child = spawn('npx', ['tsx', processorPath], {
            cwd: path.resolve(__dirname, '..'),
            env: process.env,
            stdio: 'inherit',
            shell: true,
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`[${new Date().toISOString()}] Processor completed successfully`);
                resolve({ success: true, exitCode: code });
            } else {
                console.error(`[${new Date().toISOString()}] Processor exited with code ${code}`);
                resolve({ success: false, exitCode: code });
            }
        });

        child.on('error', (err) => {
            console.error('Failed to spawn processor:', err.message);
            reject(err);
        });
    });
}

// Show queue status
function showStatus() {
    return new Promise((resolve, reject) => {
        const processorPath = path.resolve(__dirname, 'stock-fix-processor.ts');

        const child = spawn('npx', ['tsx', processorPath, '--status'], {
            cwd: path.resolve(__dirname, '..'),
            env: process.env,
            stdio: 'inherit',
            shell: true,
        });

        child.on('close', () => resolve());
        child.on('error', reject);
    });
}

// Start cron scheduler
function startCron() {
    console.log('='.repeat(60));
    console.log('STOCK FIX PROCESSOR CRON - Starting Scheduler');
    console.log('='.repeat(60));
    console.log(`Schedule: ${CONFIG.schedule} (every 15 minutes)`);
    console.log(`Timezone: ${CONFIG.timezone}`);
    console.log('-'.repeat(60));
    console.log('Press Ctrl+C to stop\n');

    cron.schedule(CONFIG.schedule, async () => {
        try {
            await runProcessor();
        } catch (error) {
            console.error('Cron job error:', error.message);
        }
    }, {
        timezone: CONFIG.timezone,
    });

    // Keep process alive
    process.on('SIGINT', () => {
        console.log('\n\nStopping Stock Fix Processor Cron...');
        process.exit(0);
    });
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--now')) {
        // Run immediately
        runProcessor()
            .then(result => {
                console.log('\nImmediate run complete');
                process.exit(result.success ? 0 : 1);
            })
            .catch(err => {
                console.error('Error:', err);
                process.exit(1);
            });

    } else if (args.includes('--status')) {
        // Show status
        showStatus()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));

    } else {
        // Start cron scheduler
        startCron();
    }
}

module.exports = { runProcessor, startCron, CONFIG };
