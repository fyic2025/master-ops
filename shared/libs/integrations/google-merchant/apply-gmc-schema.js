#!/usr/bin/env node

/**
 * APPLY GMC DASHBOARD SCHEMA to Master Hub Supabase
 *
 * Creates the snapshot and issue history tables for GMC dashboard
 */

const dotenvPath = require('path').join(__dirname, '../../../../.env');
require('dotenv').config({ path: dotenvPath });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applySchema() {
    console.log('========================================');
    console.log('GMC DASHBOARD SCHEMA DEPLOYMENT');
    console.log('========================================\n');

    // Master Hub Supabase project ref
    const projectRef = 'qcvfxxsnqvdfmpbcgdni';
    const dbPassword = process.env.SUPABASE_DB_PASSWORD || 'Welcome1A20301qaz';

    // Try different regions and connection formats
    const regions = ['aws-0-ap-southeast-2', 'aws-0-ap-southeast-1'];
    const connectionStrings = [];

    for (const region of regions) {
        // Session mode (port 5432)
        connectionStrings.push({
            str: `postgresql://postgres.${projectRef}:${dbPassword}@${region}.pooler.supabase.com:5432/postgres`,
            desc: `session mode (${region})`
        });
        // Transaction mode (port 6543)
        connectionStrings.push({
            str: `postgresql://postgres.${projectRef}:${dbPassword}@${region}.pooler.supabase.com:6543/postgres`,
            desc: `transaction mode (${region})`
        });
    }

    let client;
    let connected = false;

    for (let i = 0; i < connectionStrings.length; i++) {
        const { str, desc } = connectionStrings[i];
        console.log(`Trying ${desc} (attempt ${i + 1}/${connectionStrings.length})...`);

        client = new Client({
            connectionString: str,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000
        });

        try {
            await client.connect();
            connected = true;
            console.log(`✅ Connected via ${desc}!\n`);
            break;
        } catch (err) {
            console.log(`   Failed: ${err.message}`);
            try { await client.end(); } catch {}
        }
    }

    if (!connected) {
        console.error('❌ Could not connect with any connection string');
        console.log('\nAlternative: Apply schema via Supabase SQL Editor');
        console.log(`Open: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
        console.log('Copy contents from: infra/supabase/migrations/20251130_gmc_dashboard_schema.sql');
        process.exit(1);
    }

    try {
        // Check if tables already exist
        const snapshotCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'google_merchant_account_snapshots'
            ) as exists
        `);

        if (snapshotCheck.rows[0].exists) {
            console.log('⚠️  Tables already exist!');

            // Count existing records
            const snapshotCount = await client.query("SELECT COUNT(*) FROM google_merchant_account_snapshots");
            const issueCount = await client.query("SELECT COUNT(*) FROM google_merchant_issue_history");
            console.log(`Current data: ${snapshotCount.rows[0].count} snapshots, ${issueCount.rows[0].count} issue records`);

            console.log('\nSkipping migration. Tables are ready to use.');
            return;
        }

        // Read and apply schema file
        const schemaPath = path.join(__dirname, '../../../../infra/supabase/migrations/20251130_gmc_dashboard_schema.sql');
        console.log(`Loading schema: ${schemaPath}`);

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log(`Schema size: ${(schemaSql.length / 1024).toFixed(2)} KB\n`);

        console.log('Executing schema (this may take a moment)...\n');
        await client.query(schemaSql);

        console.log('✅ GMC Dashboard schema applied successfully!\n');

        // Verify tables
        const tableCheck = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
                AND table_name LIKE 'google_merchant_%'
            ORDER BY table_name
        `);

        console.log('Tables:');
        tableCheck.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        // Check views
        const viewCheck = await client.query(`
            SELECT table_name
            FROM information_schema.views
            WHERE table_schema = 'public'
                AND table_name LIKE 'v_gmc_%'
            ORDER BY table_name
        `);

        if (viewCheck.rows.length > 0) {
            console.log('\nViews:');
            viewCheck.rows.forEach(row => {
                console.log(`  - ${row.table_name}`);
            });
        }

        console.log('\n========================================');
        console.log('NEXT STEPS');
        console.log('========================================');
        console.log('1. ✅ Schema deployed');
        console.log('2. Run sync: node shared/libs/integrations/google-merchant/sync-products.js');
        console.log('3. Create baseline: node shared/libs/integrations/google-merchant/backfill-snapshots.js');
        console.log('4. Start dashboard: cd dashboard && npm run dev');
        console.log('5. Visit: http://localhost:3002/boo/merchant');
        console.log('========================================\n');

    } catch (error) {
        console.error('\n❌ Error applying schema:');
        console.error(error.message);

        if (error.message.includes('already exists')) {
            console.log('\n⚠️  Some objects may already exist. This is usually fine.');
        } else {
            console.log('\nAlternative: Apply schema via Supabase SQL Editor');
            console.log(`Open: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
            console.log('Copy contents from: infra/supabase/migrations/20251130_gmc_dashboard_schema.sql');
        }

        process.exit(1);
    } finally {
        await client.end();
    }
}

applySchema().catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
});
