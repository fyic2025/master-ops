const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://usibnysqelovfuctmkqw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

async function checkInventory() {
    const { data, error } = await supabase
        .from('ecommerce_products')
        .select('product_id, sku, name, inventory_level, categories')
        .ilike('brand', '%Nutra Organics%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('NUTRA ORGANICS INVENTORY CHECK');
    console.log('==============================');
    console.log('Total products:', data.length);
    console.log('');

    // Group by inventory level
    const byLevel = {};
    data.forEach(p => {
        const lvl = p.inventory_level;
        byLevel[lvl] = (byLevel[lvl] || 0) + 1;
    });

    console.log('Inventory Level Distribution:');
    Object.entries(byLevel)
        .sort((a, b) => b[1] - a[1])
        .forEach(([lvl, count]) => {
            console.log(`  Level ${lvl}: ${count} products`);
        });

    // Flag any outside 0 or 1000
    const flagged = data.filter(p => p.inventory_level !== 0 && p.inventory_level !== 1000);
    console.log('');
    console.log('Products with inventory NOT 0 or 1000:');
    if (flagged.length === 0) {
        console.log('  None - all products are 0 or 1000');
    } else {
        console.log(`  Found ${flagged.length} products:`);
        flagged.forEach(p => {
            console.log(`  [${p.product_id}] ${p.name}`);
            console.log(`    SKU: ${p.sku} | Inventory: ${p.inventory_level}`);
        });
    }
}

checkInventory().catch(err => console.error('Error:', err));
