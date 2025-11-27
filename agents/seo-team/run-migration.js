/**
 * Run SQL Migration
 * Executes SQL migration files against Supabase via direct PostgreSQL connection
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { getCredential } = require('../../shared/libs/load-vault-credentials');

let client = null;

async function getDbClient() {
    if (client) return client;

    console.log('Loading credentials from vault...');
    const dbPassword = await getCredential('boo', 'supabase_db_password');
    const projectRef = 'usibnysqelovfuctmkqw';
    const region = 'aws-0-ap-southeast-1';

    // Try session mode first (port 5432)
    const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@${region}.pooler.supabase.com:5432/postgres`;

    client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    });

    await client.connect();
    console.log('Connected to database!');
    return client;
}

async function runMigration(filename) {
    const migrationPath = path.join(__dirname, 'migrations', filename);

    if (!fs.existsSync(migrationPath)) {
        console.error(`Migration file not found: ${migrationPath}`);
        return false;
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`Running migration: ${filename}`);
    console.log('='.repeat(60));

    try {
        const dbClient = await getDbClient();
        await dbClient.query(sql);
        console.log('Migration completed successfully!');
        return true;
    } catch (err) {
        // Check if error is because objects already exist
        if (err.message.includes('already exists')) {
            console.log('Note: Some objects already exist (this is okay)');
            return true;
        }
        console.error('Migration error:', err.message);
        return false;
    }
}

// Run all migrations
async function runAllMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`Found ${files.length} migration(s)`);

    for (const file of files) {
        await runMigration(file);
        console.log('');
    }

    if (client) await client.end();
}

// CLI
const args = process.argv.slice(2);
if (args[0]) {
    runMigration(args[0]).then(async () => { if (client) await client.end(); });
} else {
    runAllMigrations();
}
