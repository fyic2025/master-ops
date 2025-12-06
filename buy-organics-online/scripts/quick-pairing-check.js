// Quick pairing check using native fetch
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

async function getCount(table) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id`, {
        headers: {
            'apikey': API_KEY,
            'Authorization': `Bearer ${API_KEY}`,
            'Prefer': 'count=exact'
        }
    });
    const range = res.headers.get('content-range');
    return range ? parseInt(range.split('/')[1]) : 0;
}

async function getLinkedBCProductIds() {
    let allIds = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/product_supplier_links?select=ecommerce_product_id&offset=${offset}&limit=${limit}`,
            {
                headers: {
                    'apikey': API_KEY,
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );
        const data = await res.json();
        if (!data || data.length === 0) break;
        allIds.push(...data.map(d => d.ecommerce_product_id));
        if (data.length < limit) break;
        offset += limit;
    }
    return [...new Set(allIds)];
}

async function main() {
    console.log('BOO PRODUCT PAIRING STATUS');
    console.log('==========================\n');

    const bcCount = await getCount('ecommerce_products');
    console.log(`BigCommerce Products: ${bcCount}`);

    const supplierCount = await getCount('supplier_products');
    console.log(`Supplier Products: ${supplierCount}`);

    const linkCount = await getCount('product_supplier_links');
    console.log(`Product-Supplier Links: ${linkCount}`);

    const linkedIds = await getLinkedBCProductIds();
    const uniqueLinked = linkedIds.length;

    console.log(`\nUnique BC Products Linked: ${uniqueLinked}`);
    console.log(`Unlinked BC Products: ${bcCount - uniqueLinked}`);
    console.log(`\nPairing Rate: ${((uniqueLinked / bcCount) * 100).toFixed(1)}%`);

    console.log('\n==========================');
}

main().catch(console.error);
