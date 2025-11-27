const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkStatus() {
    console.log('BOO PRODUCT PAIRING STATUS');
    console.log('==========================\n');

    // Count BigCommerce products
    const { count: bcCount, error: bcErr } = await supabase
        .from('ecommerce_products')
        .select('*', { count: 'exact', head: true });

    if (bcErr) {
        console.log('Error getting BC products:', bcErr.message);
    } else {
        console.log(`BigCommerce Products in Supabase: ${bcCount}`);
    }

    // Count Supplier products by supplier
    const { data: supplierCounts, error: supErr } = await supabase
        .from('supplier_products')
        .select('supplier_name');

    if (supErr) {
        console.log('Error getting supplier products:', supErr.message);
    } else {
        const counts = {};
        supplierCounts.forEach(s => {
            counts[s.supplier_name] = (counts[s.supplier_name] || 0) + 1;
        });
        console.log('\nSupplier Products in Supabase:');
        Object.keys(counts).sort().forEach(supplier => {
            console.log(`  - ${supplier}: ${counts[supplier]}`);
        });
        console.log(`  TOTAL: ${supplierCounts.length}`);
    }

    // Count product links
    const { count: linkCount, error: linkErr } = await supabase
        .from('product_supplier_links')
        .select('*', { count: 'exact', head: true });

    if (linkErr) {
        console.log('\nError getting links:', linkErr.message);
    } else {
        console.log(`\nProduct-Supplier Links: ${linkCount}`);
    }

    // Count linked products (distinct BC products that have a supplier)
    const { data: linkedProducts, error: linkedErr } = await supabase
        .from('product_supplier_links')
        .select('ecommerce_product_id')
        .limit(100000);

    if (!linkedErr && linkedProducts) {
        const uniqueLinked = new Set(linkedProducts.map(l => l.ecommerce_product_id));
        console.log(`Unique BC Products Linked: ${uniqueLinked.size}`);

        if (bcCount) {
            const unlinked = bcCount - uniqueLinked.size;
            console.log(`Unlinked BC Products: ${unlinked}`);
            console.log(`\nPairing Rate: ${((uniqueLinked.size / bcCount) * 100).toFixed(1)}%`);
        }
    }

    // Show link breakdown by match type
    const { data: linkTypes, error: ltErr } = await supabase
        .from('product_supplier_links')
        .select('match_type, supplier_name, is_active');

    if (!ltErr && linkTypes && linkTypes.length > 0) {
        console.log('\nLinks by Match Type:');
        const byType = {};
        linkTypes.forEach(l => {
            byType[l.match_type] = (byType[l.match_type] || 0) + 1;
        });
        Object.keys(byType).forEach(type => {
            console.log(`  - ${type}: ${byType[type]}`);
        });

        console.log('\nLinks by Supplier:');
        const bySupplier = {};
        linkTypes.forEach(l => {
            bySupplier[l.supplier_name] = (bySupplier[l.supplier_name] || 0) + 1;
        });
        Object.keys(bySupplier).sort().forEach(supplier => {
            console.log(`  - ${supplier}: ${bySupplier[supplier]}`);
        });

        const activeLinks = linkTypes.filter(l => l.is_active).length;
        console.log(`\nActive Links: ${activeLinks}`);
    }

    console.log('\n==========================');
    console.log('STATUS CHECK COMPLETE');
}

checkStatus().catch(err => console.error('Error:', err.message));
