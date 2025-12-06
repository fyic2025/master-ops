/**
 * Database Setup Script
 * Checks if required tables exist and creates them if needed
 * Works via REST API when possible, provides instructions when manual action needed
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Required tables for SEO team
const REQUIRED_TABLES = [
    'ecommerce_products',
    'supplier_products',
    'product_supplier_links',
    'enriched_products',
    'seo_products',
    'seo_content_queue',
    'seo_agent_logs'
];

async function checkTableExists(tableName) {
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

    if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
        return false;
    }
    return true;
}

async function checkAllTables() {
    console.log('Checking required database tables...\n');

    const results = {};
    const missing = [];

    for (const table of REQUIRED_TABLES) {
        const exists = await checkTableExists(table);
        results[table] = exists;
        if (!exists) missing.push(table);
        console.log(`  ${exists ? '✓' : '✗'} ${table}`);
    }

    return { results, missing };
}

async function tryExecuteSQL(sql) {
    // Try to execute SQL via RPC function if it exists
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        if (error.message.includes('does not exist')) {
            return { success: false, error: 'exec_sql function not available' };
        }
        return { success: false, error: error.message };
    }
    return { success: true, data };
}

async function setup() {
    console.log('='.repeat(60));
    console.log('SEO TEAM DATABASE SETUP');
    console.log('='.repeat(60));
    console.log('');

    // Check which tables exist
    const { results, missing } = await checkAllTables();

    if (missing.length === 0) {
        console.log('\n✓ All required tables exist!');
        console.log('\nYou can now run the enrichment agent:');
        console.log('  node agents/supplier-enrichment.js enrich all');
        return { success: true };
    }

    console.log(`\n⚠ Missing ${missing.length} table(s): ${missing.join(', ')}`);

    // Try to create missing tables via exec_sql RPC
    const setupAllPath = path.join(__dirname, 'migrations', 'SETUP_ALL.sql');
    const sql = fs.readFileSync(setupAllPath, 'utf8');

    console.log('\nAttempting to create tables via RPC...');
    const result = await tryExecuteSQL(sql);

    if (result.success) {
        console.log('✓ All tables created successfully!');
        return { success: true };
    }

    console.log(`✗ Could not create automatically: ${result.error}`);
    console.log('\n' + '='.repeat(60));
    console.log('ONE-TIME MANUAL SETUP REQUIRED');
    console.log('='.repeat(60));
    console.log('\n1. Open Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new');
    console.log('\n2. Copy and paste the SQL from:');
    console.log(`   ${setupAllPath}`);
    console.log('\n3. Click "Run" to execute');
    console.log('\n4. Run this script again to verify: node setup-database.js');
    console.log('\nThis only needs to be done ONCE. After that, migrations');
    console.log('will work automatically via the exec_sql function.');

    return { success: false, missing };
}

// Run setup
setup().then(result => {
    console.log('\n' + '='.repeat(60));
    if (result.success) {
        console.log('Setup complete!');
    } else {
        console.log('Setup incomplete - see instructions above');
    }
    process.exit(result.success ? 0 : 1);
});
