/**
 * Test database connection with postgres.js
 */
const postgres = require('postgres');

async function testConnection() {
    console.log('Testing Supabase PostgreSQL connection...\n');

    const configs = [
        // Direct connection (bypasses pooler)
        {
            name: 'Direct Connection',
            config: {
                host: 'db.usibnysqelovfuctmkqw.supabase.co',
                port: 5432,
                database: 'postgres',
                username: 'postgres',
                password: 'poVQq7tNNtbbDlkn',
                ssl: 'require'
            }
        },
        // Pooler with different password format
        {
            name: 'Pooler ap-southeast-1 (direct user)',
            config: {
                host: 'aws-0-ap-southeast-1.pooler.supabase.com',
                port: 5432,
                database: 'postgres',
                username: 'postgres.usibnysqelovfuctmkqw',
                password: 'poVQq7tNNtbbDlkn',
                ssl: 'require'
            }
        },
        {
            name: 'Pooler ap-southeast-1 port 6543',
            config: {
                host: 'aws-0-ap-southeast-1.pooler.supabase.com',
                port: 6543,
                database: 'postgres',
                username: 'postgres.usibnysqelovfuctmkqw',
                password: 'poVQq7tNNtbbDlkn',
                ssl: 'require'
            }
        }
    ];

    for (const { name, config } of configs) {
        console.log(`Testing: ${name}...`);

        const sql = postgres(config);

        try {
            const result = await sql`SELECT 1 as test`;
            console.log(`  ✓ SUCCESS! Connected to ${name}`);

            // Test a simple query
            const tables = await sql`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                LIMIT 5
            `;
            console.log(`  Tables found: ${tables.map(t => t.table_name).join(', ')}`);

            await sql.end();
            return { success: true, config: name, sql: postgres(config) };
        } catch (err) {
            console.log(`  ✗ Failed: ${err.message}`);
            try { await sql.end(); } catch {}
        }
    }

    console.log('\nAll connection attempts failed.');
    return { success: false };
}

testConnection().then(result => {
    if (result.success) {
        console.log(`\nWorking configuration: ${result.config}`);
    }
    process.exit(result.success ? 0 : 1);
});
