/**
 * Xero Financial Sync Weekly Cron Job
 *
 * Runs the complete Xero financial sync every Sunday at 2:00 AM AEST (16:00 UTC Saturday)
 * - Refreshes OAuth tokens
 * - Syncs journal data from Teelixir and Elevate Wholesale
 * - Applies account mappings
 * - Generates consolidated P&L and Balance Sheet
 * - Saves to Supabase
 *
 * Usage:
 *   node xero-financial-sync-cron.js           # Start cron scheduler
 *   node xero-financial-sync-cron.js --now     # Run immediately
 *   node xero-financial-sync-cron.js --status  # Check credentials status
 */

const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

// Configuration
const CONFIG = {
    jobName: 'xero-financial-sync',
    schedule: '0 16 * * 6', // 16:00 UTC Saturday = 2:00 AM Sunday AEST
    timezone: 'UTC'
};

// Supabase configuration (Master Hub)
const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

// Xero business configurations
const BUSINESSES = {
    teelixir: {
        name: 'Teelixir',
        clientId: process.env.XERO_TEELIXIR_CLIENT_ID,
        clientSecret: process.env.XERO_TEELIXIR_CLIENT_SECRET,
        refreshToken: process.env.XERO_TEELIXIR_REFRESH_TOKEN,
        tenantId: process.env.XERO_TEELIXIR_TENANT_ID,
    },
    elevate: {
        name: 'Elevate Wholesale',
        clientId: process.env.XERO_ELEVATE_CLIENT_ID,
        clientSecret: process.env.XERO_ELEVATE_CLIENT_SECRET,
        refreshToken: process.env.XERO_ELEVATE_REFRESH_TOKEN,
        tenantId: process.env.XERO_ELEVATE_TENANT_ID,
    },
};

const CREDENTIALS_FILE = path.resolve(__dirname, '../.xero-credentials.json');

// ============================================
// HTTP HELPERS
// ============================================

function httpsRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                } else {
                    resolve({ statusCode: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function supabaseRequest(method, pathStr, body = null) {
    const url = new URL(SUPABASE_URL + pathStr);

    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        },
    };

    const postData = body ? JSON.stringify(body) : null;
    const response = await httpsRequest(options, postData);
    return JSON.parse(response.data || '[]');
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

async function getStoredRefreshToken(businessKey) {
    try {
        const data = await supabaseRequest('GET', `/rest/v1/xero_tokens?business_key=eq.${businessKey}&select=refresh_token`);
        return data && data[0] ? data[0].refresh_token : null;
    } catch {
        return null;
    }
}

async function storeRefreshToken(businessKey, refreshToken) {
    try {
        // Use upsert via Prefer header
        const url = new URL(SUPABASE_URL + '/rest/v1/xero_tokens');

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates',
            },
        };

        const postData = JSON.stringify({
            business_key: businessKey,
            refresh_token: refreshToken,
            updated_at: new Date().toISOString(),
        });

        await httpsRequest(options, postData);
        console.log(`  [Token] Stored new refresh token for ${businessKey}`);
    } catch (e) {
        console.log(`  [Warning] Could not store refresh token: ${e.message}`);
    }
}

async function refreshXeroToken(config, businessKey) {
    // Try stored token first, fall back to env
    const storedToken = await getStoredRefreshToken(businessKey);
    const refreshTokenToUse = storedToken || config.refreshToken;

    if (!refreshTokenToUse) {
        throw new Error(`No refresh token available for ${businessKey}`);
    }

    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const postData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshTokenToUse,
    }).toString();

    const options = {
        hostname: 'identity.xero.com',
        path: '/connect/token',
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
        },
    };

    const response = await httpsRequest(options, postData);
    const tokenData = JSON.parse(response.data);

    // Store new refresh token (Xero tokens are single-use)
    if (tokenData.refresh_token) {
        await storeRefreshToken(businessKey, tokenData.refresh_token);
    }

    return tokenData;
}

// ============================================
// CREDENTIALS FILE MANAGEMENT
// ============================================

async function generateCredentialsFile() {
    console.log('\n[Credentials] Refreshing Xero tokens...');

    const credentials = {
        teelixir: null,
        elevate: null,
    };

    // Refresh Teelixir token
    if (BUSINESSES.teelixir.clientId && BUSINESSES.teelixir.tenantId) {
        try {
            console.log('  [Teelixir] Refreshing token...');
            const token = await refreshXeroToken(BUSINESSES.teelixir, 'teelixir');
            credentials.teelixir = {
                tenantId: BUSINESSES.teelixir.tenantId,
                tokens: {
                    access_token: token.access_token,
                    refresh_token: token.refresh_token,
                    expires_in: token.expires_in,
                    token_type: token.token_type,
                },
            };
            console.log('  [Teelixir] Token refreshed successfully');
        } catch (err) {
            console.error(`  [Teelixir] Token refresh failed: ${err.message}`);
            throw new Error(`Teelixir token refresh failed: ${err.message}`);
        }
    } else {
        throw new Error('Teelixir credentials not configured');
    }

    // Refresh Elevate token
    if (BUSINESSES.elevate.clientId && BUSINESSES.elevate.tenantId) {
        try {
            console.log('  [Elevate] Refreshing token...');
            const token = await refreshXeroToken(BUSINESSES.elevate, 'elevate');
            credentials.elevate = {
                tenantId: BUSINESSES.elevate.tenantId,
                tokens: {
                    access_token: token.access_token,
                    refresh_token: token.refresh_token,
                    expires_in: token.expires_in,
                    token_type: token.token_type,
                },
            };
            console.log('  [Elevate] Token refreshed successfully');
        } catch (err) {
            console.error(`  [Elevate] Token refresh failed: ${err.message}`);
            throw new Error(`Elevate token refresh failed: ${err.message}`);
        }
    } else {
        throw new Error('Elevate credentials not configured');
    }

    // Write credentials file
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
    console.log(`[Credentials] Saved to ${CREDENTIALS_FILE}\n`);

    return credentials;
}

// ============================================
// JOB STATUS TRACKING
// ============================================

async function updateJobStatus(success, errorMessage = null) {
    try {
        const now = new Date().toISOString();

        // Use raw SQL function via RPC
        await supabaseRequest('POST', '/rest/v1/rpc/update_job_status', {
            p_job_name: CONFIG.jobName,
            p_business: null,
            p_last_run: now,
            p_success: success,
            p_error_message: errorMessage,
        });

        console.log(`[Status] Job status updated: ${success ? 'healthy' : 'failed'}`);
    } catch (err) {
        console.log(`[Warning] Could not update job status: ${err.message}`);
    }
}

// ============================================
// SYNC RUNNER
// ============================================

async function runSync() {
    console.log('\n' + '='.repeat(70));
    console.log(`XERO FINANCIAL SYNC - Starting at ${new Date().toISOString()}`);
    console.log('='.repeat(70));

    const startTime = Date.now();

    try {
        // Step 1: Generate credentials file with fresh tokens
        await generateCredentialsFile();

        // Step 2: Run the P&L sync for all businesses
        // Note: Using sync-to-dashboard.js which uses P&L reports
        // (The journals endpoint requires additional OAuth scope)
        console.log('[Sync] Starting P&L sync for all businesses...\n');

        const syncPath = path.resolve(__dirname, '../shared/libs/integrations/xero/sync-to-dashboard.js');

        return new Promise((resolve, reject) => {
            const child = spawn('node', [syncPath], {
                cwd: path.dirname(syncPath),
                env: process.env,
                stdio: 'inherit',
                shell: true,
            });

            child.on('close', async (code) => {
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);

                if (code === 0) {
                    console.log('\n' + '='.repeat(70));
                    console.log(`SYNC COMPLETED SUCCESSFULLY in ${duration}s`);
                    console.log('='.repeat(70));
                    await updateJobStatus(true);
                    resolve({ success: true, duration });
                } else {
                    console.error(`\n[Error] Sync exited with code ${code}`);
                    await updateJobStatus(false, `Sync exited with code ${code}`);
                    reject(new Error(`Sync exited with code ${code}`));
                }
            });

            child.on('error', async (err) => {
                console.error(`\n[Error] Failed to spawn sync process: ${err.message}`);
                await updateJobStatus(false, err.message);
                reject(err);
            });
        });

    } catch (err) {
        console.error(`\n[Error] ${err.message}`);
        await updateJobStatus(false, err.message);
        throw err;
    }
}

// ============================================
// STATUS CHECK
// ============================================

async function checkStatus() {
    console.log('\n' + '='.repeat(70));
    console.log('XERO FINANCIAL SYNC - Status Check');
    console.log('='.repeat(70));

    // Check env vars
    console.log('\nEnvironment Configuration:');
    for (const [key, config] of Object.entries(BUSINESSES)) {
        const hasClientId = !!config.clientId;
        const hasSecret = !!config.clientSecret;
        const hasRefresh = !!config.refreshToken;
        const hasTenant = !!config.tenantId;

        const status = hasClientId && hasSecret && hasRefresh && hasTenant ? 'OK' : 'MISSING';
        console.log(`  ${key}: ${status}`);
        if (status === 'MISSING') {
            console.log(`    - Client ID: ${hasClientId ? 'OK' : 'MISSING'}`);
            console.log(`    - Client Secret: ${hasSecret ? 'OK' : 'MISSING'}`);
            console.log(`    - Refresh Token: ${hasRefresh ? 'OK' : 'MISSING'}`);
            console.log(`    - Tenant ID: ${hasTenant ? 'OK' : 'MISSING'}`);
        }
    }

    // Check stored tokens
    console.log('\nStored Tokens (Supabase):');
    for (const key of Object.keys(BUSINESSES)) {
        const stored = await getStoredRefreshToken(key);
        console.log(`  ${key}: ${stored ? 'Available' : 'Not stored'}`);
    }

    // Check credentials file
    console.log('\nCredentials File:');
    if (fs.existsSync(CREDENTIALS_FILE)) {
        const stats = fs.statSync(CREDENTIALS_FILE);
        const age = Math.round((Date.now() - stats.mtimeMs) / (1000 * 60 * 60));
        console.log(`  Path: ${CREDENTIALS_FILE}`);
        console.log(`  Age: ${age} hours`);
        console.log(`  Status: ${age < 24 ? 'Fresh' : 'May need refresh'}`);
    } else {
        console.log('  Not found (will be created on first run)');
    }

    // Check job status
    console.log('\nJob Status:');
    try {
        const jobs = await supabaseRequest('GET', `/rest/v1/dashboard_job_status?job_name=eq.${CONFIG.jobName}&select=*`);
        if (jobs && jobs[0]) {
            const job = jobs[0];
            console.log(`  Status: ${job.status || 'unknown'}`);
            console.log(`  Last Run: ${job.last_run_at || 'Never'}`);
            console.log(`  Last Success: ${job.last_success_at || 'Never'}`);
            if (job.error_message) {
                console.log(`  Last Error: ${job.error_message}`);
            }
        } else {
            console.log('  Job not found in monitoring table');
        }
    } catch (err) {
        console.log(`  Error checking status: ${err.message}`);
    }

    console.log('\n' + '='.repeat(70));
}

// ============================================
// CRON SCHEDULER
// ============================================

function startCron() {
    console.log('='.repeat(70));
    console.log('XERO FINANCIAL SYNC CRON - Starting Scheduler');
    console.log('='.repeat(70));
    console.log(`Job: ${CONFIG.jobName}`);
    console.log(`Schedule: ${CONFIG.schedule} (${CONFIG.timezone})`);
    console.log('Runs: 2:00 AM Sunday AEST (16:00 UTC Saturday)');
    console.log('-'.repeat(70));
    console.log('Press Ctrl+C to stop\n');

    cron.schedule(CONFIG.schedule, async () => {
        console.log(`\n[${new Date().toISOString()}] Cron triggered`);
        try {
            await runSync();
        } catch (error) {
            console.error('Cron job error:', error.message);
        }
    }, {
        timezone: CONFIG.timezone
    });

    // Keep process alive
    process.on('SIGINT', () => {
        console.log('\n\nStopping Xero Financial Sync Cron...');
        process.exit(0);
    });
}

// ============================================
// CLI INTERFACE
// ============================================

if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--now')) {
        // Run immediately
        runSync()
            .then(() => {
                console.log('\nImmediate run complete');
                process.exit(0);
            })
            .catch(err => {
                console.error('Error:', err.message);
                process.exit(1);
            });

    } else if (args.includes('--status')) {
        // Check status
        checkStatus()
            .then(() => process.exit(0))
            .catch(err => {
                console.error('Error:', err.message);
                process.exit(1);
            });

    } else {
        // Start cron scheduler
        startCron();
    }
}

module.exports = { runSync, startCron, checkStatus, CONFIG };
