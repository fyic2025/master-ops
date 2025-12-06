const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Sample unmatched UN - SKUs from deletion candidates
const unmatchedSamples = [
    'UN - AM06',
    'UN - EH07',
    'UN - GK04',
    'UN - GV25',
    'UN - NT19',
    'UN - OG36',
    'UN - AF01'
];

async function check() {
    console.log('CHECKING WHY UN - PRODUCTS ARE NOT MATCHING\n');
    console.log('='.repeat(60) + '\n');

    // Get sample of UHP supplier SKUs
    const { data: uhpProducts, error } = await supabase
        .from('supplier_products')
        .select('supplier_sku, product_name, stock_level')
        .eq('supplier_name', 'uhp')
        .limit(20);

    console.log('SAMPLE UHP SUPPLIER SKUs:');
    uhpProducts.forEach(p => {
        console.log(`  ${p.supplier_sku.padEnd(15)} | Stock: ${String(p.stock_level).padEnd(5)} | ${p.product_name.substring(0, 40)}`);
    });

    console.log('\n' + '='.repeat(60) + '\n');
    console.log('CHECKING UNMATCHED BC PRODUCTS:\n');

    for (const bcSku of unmatchedSamples) {
        // Extract supplier SKU from BC SKU (e.g., "UN - AM06" -> "AM06")
        const match = bcSku.match(/^UN\s*-\s*(.+)$/i);
        const supplierSku = match ? match[1].trim() : null;

        console.log(`BC SKU: "${bcSku}" -> Supplier SKU: "${supplierSku}"`);

        if (supplierSku) {
            // Search for exact match
            const { data: exact } = await supabase
                .from('supplier_products')
                .select('supplier_sku, product_name, stock_level')
                .eq('supplier_name', 'uhp')
                .eq('supplier_sku', supplierSku);

            // Search for case-insensitive match
            const { data: similar } = await supabase
                .from('supplier_products')
                .select('supplier_sku, product_name, stock_level')
                .eq('supplier_name', 'uhp')
                .ilike('supplier_sku', `%${supplierSku}%`);

            if (exact && exact.length > 0) {
                console.log(`  EXACT MATCH FOUND: ${exact[0].supplier_sku} (stock: ${exact[0].stock_level})`);
            } else if (similar && similar.length > 0) {
                console.log(`  SIMILAR MATCHES:`);
                similar.slice(0, 3).forEach(s => {
                    console.log(`    - ${s.supplier_sku} (stock: ${s.stock_level}) ${s.product_name.substring(0, 30)}`);
                });
            } else {
                console.log(`  NOT IN UHP DATA - TRULY DISCONTINUED`);
            }
        }
        console.log('');
    }

    // Count how many UN - products exist in UHP
    console.log('='.repeat(60) + '\n');
    console.log('SUMMARY:\n');

    const { count: uhpTotal } = await supabase
        .from('supplier_products')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_name', 'uhp');

    console.log(`Total UHP products in Supabase: ${uhpTotal}`);

    // Get all unmatched UN - SKUs
    const data = require('./deletion-candidates.json');
    const unSkus = data.products
        .filter(p => p.sku && /^UN\s*-/i.test(p.sku))
        .map(p => {
            const m = p.sku.match(/^UN\s*-\s*(.+)$/i);
            return m ? m[1].trim() : null;
        })
        .filter(Boolean);

    console.log(`Unmatched UN - products: ${unSkus.length}`);

    // Check how many of these exist in UHP
    let foundCount = 0;
    let notFoundCount = 0;

    for (const sku of unSkus.slice(0, 100)) { // Check first 100
        const { data: found } = await supabase
            .from('supplier_products')
            .select('supplier_sku')
            .eq('supplier_name', 'uhp')
            .eq('supplier_sku', sku)
            .limit(1);

        if (found && found.length > 0) {
            foundCount++;
        } else {
            notFoundCount++;
        }
    }

    console.log(`\nSample check (first 100):`);
    console.log(`  Found in UHP: ${foundCount} (matching bug)`);
    console.log(`  Not in UHP: ${notFoundCount} (discontinued)`);
}

check().catch(err => console.error('Error:', err.message));
