/**
 * Apply Enrichment Schema to Supabase
 * Uses the same connection pattern as the working apply-schema.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { getCredential } = require('../../shared/libs/load-vault-credentials');

async function applySchema() {
    console.log('Connecting to Supabase...');

    // Password from vault
    const dbPassword = 'poVQq7tNNtbbDlkn';
    const projectRef = 'usibnysqelovfuctmkqw';

    console.log(`Connecting to project: ${projectRef}`);

    // Try both regions
    const regions = ['aws-0-ap-southeast-2', 'aws-0-ap-southeast-1'];

    // Try different password formats and connection modes
    const passwordFormats = [
        dbPassword,
        encodeURIComponent(dbPassword),
    ];

    const connectionStrings = [];
    const descriptions = [];

    for (const region of regions) {
        for (const pwd of passwordFormats) {
            // Transaction mode (port 6543) - most common
            connectionStrings.push(`postgresql://postgres.${projectRef}:${pwd}@${region}.pooler.supabase.com:6543/postgres`);
            descriptions.push(`${region} transaction mode`);
            // Session mode (port 5432)
            connectionStrings.push(`postgresql://postgres.${projectRef}:${pwd}@${region}.pooler.supabase.com:5432/postgres`);
            descriptions.push(`${region} session mode`);
        }
    }

    let client;
    let connected = false;

    for (let i = 0; i < connectionStrings.length; i++) {
        const connStr = connectionStrings[i];
        const desc = descriptions[i];
        console.log(`Trying ${desc} (attempt ${i + 1}/${connectionStrings.length})...`);

        client = new Client({
            connectionString: connStr,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
        });

        try {
            await client.connect();
            connected = true;
            console.log(`Connected via ${desc}!`);
            break;
        } catch (err) {
            console.log(`  Failed: ${err.message}`);
            try { await client.end(); } catch { }
        }
    }

    if (!connected) {
        throw new Error('Could not connect with any connection string');
    }

    try {
        // Read the schema file
        const schemaPath = path.join(__dirname, 'migrations', '001_create_enriched_products.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('\nApplying enriched_products schema...');
        await client.query(schema);

        console.log('Schema applied successfully!');

        // Verify table was created
        const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
                AND table_name = 'enriched_products'
        `);

        if (result.rows.length > 0) {
            console.log('\nTable created: enriched_products');
        } else {
            console.log('\nWarning: Table may not have been created');
        }

        // Show indexes
        const indexes = await client.query(`
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'enriched_products'
        `);

        console.log('\nIndexes created:');
        indexes.rows.forEach(row => console.log(`  - ${row.indexname}`));

    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('Note: Table already exists (this is okay)');
        } else {
            console.error('Error applying schema:', err.message);
            throw err;
        }
    } finally {
        await client.end();
        console.log('\nConnection closed');
    }
}

applySchema().catch(err => {
    console.error('Failed:', err.message);
    process.exit(1);
});
