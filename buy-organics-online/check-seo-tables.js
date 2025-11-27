const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

async function check() {
    console.log('Checking SEO tables in Supabase...\n');

    const tables = ['seo_categories', 'seo_brands', 'seo_products', 'seo_gsc_pages', 'seo_keywords'];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('id').limit(1);
        if (error && error.message.includes('does not exist')) {
            console.log(`  ${table}: NOT EXISTS`);
        } else if (error) {
            console.log(`  ${table}: ERROR - ${error.message}`);
        } else {
            console.log(`  ${table}: EXISTS (${data.length} rows returned)`);
        }
    }
}

check().catch(console.error);
