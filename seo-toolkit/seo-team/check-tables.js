const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTables() {
    // Try to query enriched_products to see if it exists
    console.log('Checking if enriched_products table exists...\n');

    const { data, error } = await supabase
        .from('enriched_products')
        .select('*')
        .limit(1);

    if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
            console.log('Table enriched_products does NOT exist yet.');
            console.log('\nPlease run the migration:');
            console.log('1. Go to: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql');
            console.log('2. Copy contents from: agents/seo-team/migrations/001_create_enriched_products.sql');
            console.log('3. Click Run');
            return false;
        }
        console.log('Error:', error.message);
        return false;
    }

    console.log('Table enriched_products EXISTS!');
    console.log('Records found:', data?.length || 0);
    return true;
}

checkTables();
