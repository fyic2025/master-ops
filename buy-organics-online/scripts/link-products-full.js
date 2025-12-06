/**
 * Link BigCommerce Products to Suppliers (FULL - No Limits)
 *
 * Matches ecommerce_products to supplier_products via:
 * 1. Barcode match (primary)
 * 2. SKU prefix match (OB -, KAD -, UN -, KIK -)
 * 3. Direct SKU match
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Fetch ALL records with pagination
async function fetchAllRecords(table, selectCols) {
    const PAGE_SIZE = 1000;
    let allRecords = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from(table)
            .select(selectCols)
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);

        allRecords = allRecords.concat(data);

        if (data.length < PAGE_SIZE) {
            hasMore = false;
        } else {
            page++;
        }
    }

    return allRecords;
}

function normalizeBarcode(barcode) {
    if (!barcode) return null;
    const normalized = barcode.toString().trim().replace(/^0+/, '').toUpperCase();
    return normalized.length > 0 ? normalized : null;
}

// Extract supplier SKU from BC SKU like "OB - ABC123"
function parseSkuPrefix(bcSku) {
    if (!bcSku) return null;

    const patterns = [
        { regex: /^(OB|NEWOB)\s*[-–]\s*(.+)$/i, supplier: 'oborne' },
        { regex: /^(KAD|NEWKAD)\s*[-–]\s*(.+)$/i, supplier: 'kadac' },
        { regex: /^(UN|NEWUN)\s*[-–]\s*(.+)$/i, supplier: 'uhp' },
        { regex: /^(KIK)\s*[-–]\s*(.+)$/i, supplier: 'unleashed' }
    ];

    for (const { regex, supplier } of patterns) {
        const match = bcSku.match(regex);
        if (match) {
            return { supplier, supplierSku: match[2].trim() };
        }
    }

    return null;
}

async function linkProducts() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('FULL PRODUCT-SUPPLIER LINKING');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Fetch all data
    console.log('Fetching BigCommerce products...');
    const bcProducts = await fetchAllRecords('ecommerce_products', 'id, sku, name, barcode, gtin, upc, ean');
    console.log(`  ✓ ${bcProducts.length} products\n`);

    console.log('Fetching supplier products...');
    const supplierProducts = await fetchAllRecords('supplier_products', 'id, supplier_name, supplier_sku, barcode, product_name');
    console.log(`  ✓ ${supplierProducts.length} products\n`);

    // Build indexes
    console.log('Building indexes...');

    // Barcode index (normalized barcode -> array of supplier products)
    const barcodeIndex = new Map();
    for (const sp of supplierProducts) {
        const normalizedBarcode = normalizeBarcode(sp.barcode);
        if (normalizedBarcode) {
            if (!barcodeIndex.has(normalizedBarcode)) {
                barcodeIndex.set(normalizedBarcode, []);
            }
            barcodeIndex.get(normalizedBarcode).push(sp);
        }
    }
    console.log(`  Barcode index: ${barcodeIndex.size} unique barcodes`);

    // Supplier SKU index (supplier:sku -> supplier product)
    const skuIndex = new Map();
    for (const sp of supplierProducts) {
        if (sp.supplier_sku) {
            const key = `${sp.supplier_name}:${sp.supplier_sku.toLowerCase()}`;
            skuIndex.set(key, sp);
        }
    }
    console.log(`  SKU index: ${skuIndex.size} supplier SKUs\n`);

    // Clear existing links
    console.log('Clearing existing links...');
    const { error: deleteErr } = await supabase
        .from('product_supplier_links')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteErr) {
        console.log(`  Warning: ${deleteErr.message}`);
    } else {
        console.log('  ✓ Cleared\n');
    }

    // Match products
    console.log('Matching products...\n');
    const links = [];
    const stats = {
        barcodeMatches: 0,
        skuPrefixMatches: 0,
        directSkuMatches: 0,
        totalLinked: 0,
        multiSupplier: 0
    };

    const supplierPriority = {
        'oborne': 1,
        'kadac': 2,
        'uhp': 3,
        'unleashed': 4
    };

    for (const bc of bcProducts) {
        const matchedSuppliers = new Set();
        const productLinks = [];

        // 1. Barcode matching (try all barcode fields)
        const barcodes = [
            normalizeBarcode(bc.barcode),
            normalizeBarcode(bc.gtin),
            normalizeBarcode(bc.upc),
            normalizeBarcode(bc.ean)
        ].filter(b => b !== null);

        for (const barcode of barcodes) {
            const matches = barcodeIndex.get(barcode);
            if (matches) {
                for (const sp of matches) {
                    if (!matchedSuppliers.has(sp.supplier_name)) {
                        productLinks.push({
                            ecommerce_product_id: bc.id,
                            supplier_product_id: sp.id,
                            supplier_name: sp.supplier_name,
                            match_type: 'barcode',
                            is_active: false,
                            priority: 999
                        });
                        matchedSuppliers.add(sp.supplier_name);
                        stats.barcodeMatches++;
                    }
                }
            }
        }

        // 2. SKU prefix matching (OB - xxx, KAD - xxx, etc.)
        const skuParsed = parseSkuPrefix(bc.sku);
        if (skuParsed && !matchedSuppliers.has(skuParsed.supplier)) {
            const key = `${skuParsed.supplier}:${skuParsed.supplierSku.toLowerCase()}`;
            const sp = skuIndex.get(key);
            if (sp) {
                productLinks.push({
                    ecommerce_product_id: bc.id,
                    supplier_product_id: sp.id,
                    supplier_name: sp.supplier_name,
                    match_type: 'sku_prefix',
                    is_active: false,
                    priority: 999
                });
                matchedSuppliers.add(sp.supplier_name);
                stats.skuPrefixMatches++;
            }
        }

        // 3. Direct SKU matching (BC SKU = Supplier SKU)
        if (bc.sku && productLinks.length === 0) {
            for (const supplier of ['oborne', 'kadac', 'uhp', 'unleashed']) {
                const key = `${supplier}:${bc.sku.toLowerCase()}`;
                const sp = skuIndex.get(key);
                if (sp && !matchedSuppliers.has(supplier)) {
                    productLinks.push({
                        ecommerce_product_id: bc.id,
                        supplier_product_id: sp.id,
                        supplier_name: sp.supplier_name,
                        match_type: 'sku_direct',
                        is_active: false,
                        priority: 999
                    });
                    matchedSuppliers.add(supplier);
                    stats.directSkuMatches++;
                }
            }
        }

        // Set priorities based on supplier preference
        if (productLinks.length > 0) {
            productLinks.sort((a, b) => {
                return (supplierPriority[a.supplier_name] || 999) - (supplierPriority[b.supplier_name] || 999);
            });

            productLinks.forEach((link, idx) => {
                link.priority = idx + 1;
            });

            // First one is active
            productLinks[0].is_active = true;

            if (productLinks.length > 1) {
                stats.multiSupplier++;
            }

            stats.totalLinked++;
            links.push(...productLinks);
        }
    }

    // Summary
    console.log('Match Results:');
    console.log(`  Barcode matches:     ${stats.barcodeMatches}`);
    console.log(`  SKU prefix matches:  ${stats.skuPrefixMatches}`);
    console.log(`  Direct SKU matches:  ${stats.directSkuMatches}`);
    console.log(`  Products linked:     ${stats.totalLinked}`);
    console.log(`  Multi-supplier:      ${stats.multiSupplier}`);
    console.log(`  Total links:         ${links.length}\n`);

    // Insert in batches
    if (links.length > 0) {
        console.log('Saving links to Supabase...');
        const BATCH_SIZE = 500;
        let saved = 0;

        for (let i = 0; i < links.length; i += BATCH_SIZE) {
            const batch = links.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(links.length / BATCH_SIZE);

            const { error } = await supabase
                .from('product_supplier_links')
                .insert(batch);

            if (error) {
                console.log(`  Batch ${batchNum} error: ${error.message}`);
            } else {
                saved += batch.length;
                console.log(`  ✓ Batch ${batchNum}/${totalBatches} (${saved}/${links.length})`);
            }
        }
    }

    // Final summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`BigCommerce Products:     ${bcProducts.length}`);
    console.log(`Supplier Products:        ${supplierProducts.length}`);
    console.log(`Products WITH supplier:   ${stats.totalLinked} (${(stats.totalLinked / bcProducts.length * 100).toFixed(1)}%)`);
    console.log(`Products WITHOUT supplier: ${bcProducts.length - stats.totalLinked}`);
    console.log(`Multi-supplier products:  ${stats.multiSupplier}`);
    console.log(`Total links created:      ${links.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');
}

linkProducts().catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
});
