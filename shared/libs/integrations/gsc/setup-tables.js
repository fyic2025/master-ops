/**
 * Setup GSC Tables in Supabase
 *
 * This script creates the GSC tables using Supabase JavaScript client.
 * Run once to set up the schema.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env'), override: true });

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES_SQL = `
-- GSC Pages Table (minimal version, no FK dependencies)
CREATE TABLE IF NOT EXISTS seo_gsc_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL UNIQUE,
    page_type TEXT,

    -- Traffic metrics
    impressions_30d INTEGER DEFAULT 0,
    clicks_30d INTEGER DEFAULT 0,
    avg_position DECIMAL(5,2),
    ctr DECIMAL(5,4),

    first_seen DATE,
    last_updated DATE
);

CREATE INDEX IF NOT EXISTS idx_gsc_pages_url ON seo_gsc_pages(url);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_type ON seo_gsc_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_impressions ON seo_gsc_pages(impressions_30d DESC);

-- GSC Keywords Table
CREATE TABLE IF NOT EXISTS seo_gsc_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID REFERENCES seo_gsc_pages(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    avg_position DECIMAL(5,2),
    ctr DECIMAL(5,4),
    date DATE NOT NULL,
    UNIQUE(page_id, keyword, date)
);

CREATE INDEX IF NOT EXISTS idx_gsc_keywords_page ON seo_gsc_keywords(page_id);
CREATE INDEX IF NOT EXISTS idx_gsc_keywords_date ON seo_gsc_keywords(date DESC);

-- Agent logs (for tracking sync activity)
CREATE TABLE IF NOT EXISTS seo_agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    status TEXT CHECK (status IN ('started', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_name ON seo_agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON seo_agent_logs(created_at DESC);
`;

async function setupTables() {
    console.log('Setting up GSC tables in Supabase...');
    console.log('Supabase URL:', SUPABASE_URL);

    // Try to execute SQL via rpc if available
    const { data, error } = await supabase.rpc('exec_sql', { sql: TABLES_SQL });

    if (error && error.code === 'PGRST202') {
        console.log('\nThe exec_sql function is not available.');
        console.log('Please run this SQL manually in Supabase Dashboard > SQL Editor:\n');
        console.log('=' .repeat(60));
        console.log(TABLES_SQL);
        console.log('=' .repeat(60));
        console.log('\nOr create the tables via the Supabase Dashboard > Table Editor');
        return false;
    }

    if (error) {
        console.error('Error:', error.message);
        return false;
    }

    console.log('Tables created successfully!');
    return true;
}

// Output SQL file for manual execution
async function outputSQLFile() {
    const fs = require('fs');
    const sqlPath = path.join(__dirname, 'gsc-tables.sql');
    fs.writeFileSync(sqlPath, TABLES_SQL);
    console.log(`SQL file written to: ${sqlPath}`);
    console.log('\nTo apply, either:');
    console.log('1. Copy the SQL above to Supabase Dashboard > SQL Editor');
    console.log('2. Use Supabase CLI: supabase db push');
}

if (require.main === module) {
    setupTables().then(success => {
        if (!success) {
            outputSQLFile();
        }
    });
}

module.exports = { setupTables, TABLES_SQL };
