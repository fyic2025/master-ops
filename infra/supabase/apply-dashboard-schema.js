/**
 * Apply Dashboard Hub Schema to Master Supabase (teelixir_leads)
 * Run: node infra/supabase/apply-dashboard-schema.js
 */

const fs = require('fs');
const path = require('path');

// Master Supabase credentials
const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

async function applySchema() {
    console.log('📦 Applying Dashboard Hub Schema to Master Supabase...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '20251128_dashboard_hub_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`📄 Read migration file: ${migrationPath}`);
    console.log(`📊 SQL length: ${sql.length} characters\n`);

    // Split into individual statements (simple split on semicolons outside strings)
    // For complex SQL, we'll send it as one query via the REST API

    try {
        // Use Supabase REST API to execute SQL
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({})
        });

        // The REST API doesn't support raw SQL execution
        // We need to use the Management API or run it manually

        console.log('⚠️  Supabase REST API does not support raw SQL execution.');
        console.log('');
        console.log('Please run the migration manually:');
        console.log('');
        console.log('1. Go to: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new');
        console.log('2. Copy and paste the contents of:');
        console.log(`   ${migrationPath}`);
        console.log('3. Click "Run"');
        console.log('');
        console.log('Or copy this SQL directly:\n');
        console.log('─'.repeat(60));
        console.log(sql.substring(0, 2000) + '...\n[truncated - see full file]');
        console.log('─'.repeat(60));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Alternative: Test if tables already exist
async function checkTables() {
    console.log('🔍 Checking if dashboard tables already exist...\n');

    const tables = [
        'dashboard_alerts',
        'dashboard_business_metrics',
        'dashboard_health_checks',
        'sync_google_ads_metrics',
        'sync_integration_logs'
    ];

    for (const table of tables) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=1`, {
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ ${table} - exists (${data.length} rows returned)`);
            } else if (response.status === 404) {
                console.log(`❌ ${table} - does not exist`);
            } else {
                console.log(`⚠️  ${table} - ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.log(`❌ ${table} - error: ${error.message}`);
        }
    }
}

// Run
async function main() {
    await checkTables();
    console.log('');
    await applySchema();
}

main();
