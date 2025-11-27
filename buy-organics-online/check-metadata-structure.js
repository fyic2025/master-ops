const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

async function checkStructure() {
    // Get one product with all fields
    const { data, error } = await supabase
        .from('ecommerce_products')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    const product = data[0];
    console.log('FULL PRODUCT STRUCTURE');
    console.log('======================\n');

    console.log('Table columns:');
    Object.keys(product).forEach(key => {
        const value = product[key];
        const type = value === null ? 'null' : typeof value;
        const preview = type === 'object' ? JSON.stringify(value).substring(0, 100) : String(value).substring(0, 100);
        console.log('  ' + key + ' (' + type + '): ' + preview);
    });

    console.log('\n\nFULL METADATA:');
    console.log(JSON.stringify(product.metadata, null, 2));

    console.log('\n\nCATEGORIES FIELD:');
    console.log(JSON.stringify(product.categories, null, 2));

    // Check if brand could be parsed from name
    console.log('\n\n=== POTENTIAL BRAND EXTRACTION ===');
    const { data: samples } = await supabase
        .from('ecommerce_products')
        .select('name')
        .limit(20);

    console.log('\nSample product names (brand often at start or end):');
    samples.forEach((p, i) => {
        console.log('  ' + (i + 1) + '. ' + p.name);
    });
}

checkStructure().catch(console.error);
