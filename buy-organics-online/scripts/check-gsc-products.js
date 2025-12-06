const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Sample of GSC "Invalid SKU" products to check
const gscProducts = [
    'Lakanto Brown Monkfruit Sweetener Brown Sugar Replacement 225g',
    'Mingle Green Goddess All Natural Seasoning 10 x 40g',
    'DJ&A Nature\'s Protein Green Peas 12 x 75g',
    'Epzen Body Wash Clearing AHAs & Salicylic Acid 400ml',
    'Acure Mega Moisture Conditioner Argan 236ml',
    'Buderim Ginger Naked Ginger Sliced 350g',
    'Mindful Foods Maple Munchies Organic & Activated 90g',
    'Protein Supplies Australia Whey Protein Isolate (WPI) 3kg',
    'Faith In Nature Conditioner Soothing Aloe Vera 400ml',
    'Koala Eco Laundry Wash Mandarin & Peppermint 1L',
    'Dr Bronner\'s All One Toothpaste Cinnamon 140g',
    'Antipodes Hosanna Collagen-Plumping Water Serum 30ml',
    'Switch Nutrition BHB Beta-Hydroxybutyrate 90 Caps',
    'Giovanni Conditioner (Mini) 50/50 Balanced (Normal/Dry Hair) 60ml',
    'Lotus Rice Flakes Brown Rolled 500g',
    'Planet Organic Cacao Powder 175g',
    'Every Bit Organic Coconut Oil Virgin & Unrefined 500ml',
    'Orgran Gluten Free Crispibread Buckwheat 125g',
    'Heritage Store Rosewater Refreshing Facial Mist 118ml',
    'Blue Dinosaur Hand-Baked Energy Bar Caramel Choc Chunk 12 x 45g'
];

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
        hasMore = data.length === PAGE_SIZE;
        page++;
    }

    return allRecords;
}

async function check() {
    console.log('CHECKING GSC "INVALID SKU" PRODUCTS\n');
    console.log('='.repeat(70) + '\n');

    // Get all BC products
    console.log('Loading BigCommerce products...');
    const bcProducts = await fetchAllRecords('ecommerce_products',
        'id, product_id, sku, name, inventory_level, price, barcode, gtin');
    console.log(`  Loaded ${bcProducts.length} products\n`);

    // Get all links
    console.log('Loading supplier links...');
    const links = await fetchAllRecords('product_supplier_links', 'ecommerce_product_id, supplier_name');
    const linkedIds = new Set(links.map(l => l.ecommerce_product_id));
    console.log(`  ${linkedIds.size} products linked\n`);

    // Check each GSC product
    console.log('='.repeat(70));
    console.log('SAMPLE GSC PRODUCTS STATUS:\n');

    let paired = 0;
    let unpaired = 0;
    let notFound = 0;

    for (const productName of gscProducts) {
        // Find by name (fuzzy match)
        const found = bcProducts.find(p =>
            p.name && p.name.toLowerCase().includes(productName.toLowerCase().substring(0, 30))
        );

        if (found) {
            const isLinked = linkedIds.has(found.id);
            const status = isLinked ? 'PAIRED' : 'NOT PAIRED';
            const stock = found.inventory_level || 0;

            if (isLinked) paired++;
            else unpaired++;

            console.log(`[${status}] ${productName.substring(0, 50)}`);
            console.log(`    SKU: ${found.sku || '(empty)'} | Stock: ${stock} | Price: $${found.price}`);
            console.log(`    Barcode: ${found.barcode || found.gtin || '(none)'}`);
            console.log('');
        } else {
            notFound++;
            console.log(`[NOT FOUND] ${productName.substring(0, 50)}`);
            console.log('');
        }
    }

    console.log('='.repeat(70));
    console.log('SAMPLE SUMMARY:');
    console.log(`  Paired with supplier: ${paired}`);
    console.log(`  NOT paired: ${unpaired}`);
    console.log(`  Not found in DB: ${notFound}`);
    console.log('='.repeat(70) + '\n');

    // Now check what's common about the SKUs of these products
    console.log('ANALYZING SKU PATTERNS OF GSC FLAGGED PRODUCTS:\n');

    // Get products that might have SKU issues
    const skuPatterns = {
        empty: bcProducts.filter(p => !p.sku || p.sku.trim() === ''),
        hasSpaces: bcProducts.filter(p => p.sku && /\s/.test(p.sku)),
        specialChars: bcProducts.filter(p => p.sku && /[<>"'&]/.test(p.sku)),
        veryLong: bcProducts.filter(p => p.sku && p.sku.length > 100),
        normal: bcProducts.filter(p => p.sku && p.sku.trim() !== '' && !/\s/.test(p.sku) && p.sku.length <= 100)
    };

    console.log('SKU Pattern Analysis (all BC products):');
    console.log(`  Empty SKU: ${skuPatterns.empty.length}`);
    console.log(`  Has spaces: ${skuPatterns.hasSpaces.length}`);
    console.log(`  Special chars (<>"'&): ${skuPatterns.specialChars.length}`);
    console.log(`  Very long (>100): ${skuPatterns.veryLong.length}`);
    console.log(`  Normal: ${skuPatterns.normal.length}`);

    if (skuPatterns.hasSpaces.length > 0) {
        console.log('\nSample SKUs with spaces:');
        skuPatterns.hasSpaces.slice(0, 10).forEach(p => {
            console.log(`  "${p.sku}" -> ${p.name?.substring(0, 40)}`);
        });
    }
}

check().catch(err => console.error('Error:', err.message));
