const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');

const BC_STORE_HASH = 'hhhi';
const BC_ACCESS_TOKEN = 'eeikmonznnsxcq4f24m9d6uvv1e0qjn';
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

// Brands to delete (all 0 inventory, no linked products) - EXCLUDING Allan K Suttons
const BRANDS_TO_DELETE = [
    'Only Emu', 'Mayvers', 'Wallaby', 'Meo', 'Celestial', 'Life Cycle', 'Flora Remedia',
    'Gelatin Health', "Nature's Child", 'Marigold Health Foods', 'Byron Bay Macadamia Muesli',
    'Organic Oat Slice', 'Mt Somers', 'Bains Wholefoods', 'Thankfully Nourished', 'dr plotka',
    'Good Morning Cereals', 'Jak Organics', 'Tonik Pro', 'AromaStick', 'Frequency H2O',
    'Megaburn', 'Entity Health', 'ANC Health Supplements | Buy Organics O', 'Cocolife',
    'BSKT', 'Fiji Kava', 'Earths Purities', 'Foda', 'Barbell Foods', 'Coco Earth',
    'Golden Ghee Co', 'Alter Dist', 'Grounded', 'Elmore Oil', 'Premedy', 'Bundys Health',
    'Healr', 'Meditree', 'Mygen Health', 'Amys Kitchen', 'Byron Bay Bellies', 'Complete Health',
    'Four Leaf', 'Kallo', 'Lenny & Larry', 'Smooze Fruit Ice', 'Tri Natural', 'Vgood',
    'Teeccino', 'Fire Tonic', 'Dermal Therapy', 'Herbal Wellbeing', 'Natural Fertility',
    'Wrappa', 'Biopet', 'Ouch!', 'Flor Essence', 'Simply 7', 'Tonik Plant', 'Bioplus',
    'Happy Turtle', 'Clean & Green Wholefoods', 'Sunray', 'Veego Bars', 'Complete Natural Remedies',
    'Mthfr Group', 'Buy Organics Online', 'Byron Bay Medicinal Herbs', 'Herbal Extract Company Misc',
    'Peter Dingle', '180 Cakes', 'Slater Farms', 'Burrum Biodynamic Farm', 'Rosa Naturals',
    'SkinB5', 'Soleo Organics', 'Siena', 'Hakubaku', 'Tiger Balm', 'Goli Nutrition',
    'Kookas Natural', 'Jimalie Coconut Products', 'Charco', 'Kaeh Women', 'Shady Maple Farms',
    'Sanitiser', 'Rainforest Remedies', 'Titree Spirit Herbals', 'Corporate Health & Safety',
    'Smart Juice', 'Maharishi Ayurveda', 'Demeter Bio-Dynamic', 'Australian Organic Network',
    'Invisi Shield', 'Concord Eye Care', 'The DivaCup', 'Vicco', 'Refresh Byron Bay',
    'Phytality Nutrition', 'Xlear', 'Atmosphere', 'Sanitarium', 'Health 2u', 'Edwards/VIC'
];

// Category redirects based on brand type
const REDIRECT_MAP = {
    'Only Emu': '/body-care/',
    'Mayvers': '/pantry/',
    'Wallaby': '/snacks/',
    'Meo': '/pantry/',
    'Celestial': '/tea/',
    'Life Cycle': '/supplements/',
    'Flora Remedia': '/essential-oils/',
    'Gelatin Health': '/supplements/',
    "Nature's Child": '/baby/',
    'Marigold Health Foods': '/pantry/',
    'Byron Bay Macadamia Muesli': '/breakfast/',
    'Organic Oat Slice': '/snacks/',
    'Mt Somers': '/honey/',
    'Bains Wholefoods': '/snacks/',
    'Thankfully Nourished': '/supplements/',
    'dr plotka': '/dental-care/',
    'Good Morning Cereals': '/breakfast/',
    'Jak Organics': '/body-care/',
    'Tonik Pro': '/protein/',
    'Fiji Kava': '/supplements/',
    'Entity Health': '/supplements/',
    'Amys Kitchen': '/pantry/',
    'default': '/health-foods-organic-groceries/'
};

const DRY_RUN = !process.argv.includes('--execute');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function supabaseGet(endpoint) {
    const cmd = `curl -s "${SUPABASE_URL}/rest/v1/${endpoint}" -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}"`;
    try {
        const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
        return JSON.parse(result);
    } catch (e) {
        console.error('Supabase GET error:', e.message);
        return [];
    }
}

function supabaseDelete(table, id) {
    const cmd = `curl -s -X DELETE "${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}" -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}"`;
    try {
        execSync(cmd, { encoding: 'utf8' });
        return true;
    } catch (e) {
        return false;
    }
}

function bcRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.bigcommerce.com',
            path: `/stores/${BC_STORE_HASH}${path}`,
            method,
            headers: {
                'X-Auth-Token': BC_ACCESS_TOKEN,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 404) resolve(null);
                else if (res.statusCode === 429) {
                    console.log('  Rate limited, waiting 30s...');
                    setTimeout(() => bcRequest(method, path, body).then(resolve).catch(reject), 30000);
                }
                else if (res.statusCode >= 200 && res.statusCode < 300) resolve(data ? JSON.parse(data) : {});
                else reject(new Error(`BC API ${res.statusCode}: ${data.substring(0, 200)}`));
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function getProductUrl(productId) {
    try {
        const product = await bcRequest('GET', `/v3/catalog/products/${productId}`);
        if (product && product.data && product.data.custom_url) {
            return product.data.custom_url.url;
        }
    } catch (e) {}
    return null;
}

async function createRedirect(fromUrl, toUrl) {
    try {
        await bcRequest('POST', '/v3/storefront/redirects', {
            from_path: fromUrl,
            to_url: toUrl,
            site_id: 1000
        });
        return true;
    } catch (e) {
        console.log(`    Redirect error: ${e.message.substring(0,100)}`);
        return false;
    }
}

async function deleteFromBC(productId) {
    try {
        await bcRequest('DELETE', `/v3/catalog/products/${productId}`);
        return true;
    } catch (e) {
        return false;
    }
}

async function main() {
    console.log('='.repeat(70));
    console.log(DRY_RUN ? 'DRY RUN - No changes will be made' : 'LIVE RUN - Changes will be applied');
    console.log('='.repeat(70));
    console.log(`Brands to process: ${BRANDS_TO_DELETE.length}`);
    console.log('Excluding: Allan K Suttons\n');

    // Fetch all products, then filter
    console.log('Fetching products from Supabase...');
    let allProducts = [];
    let offset = 0;
    while (true) {
        const batch = supabaseGet(`ecommerce_products?select=id,product_id,sku,name,brand,inventory_level,custom_url&offset=${offset}&limit=1000`);
        if (!batch || batch.length === 0) break;
        allProducts = allProducts.concat(batch);
        offset += 1000;
        if (batch.length < 1000) break;
    }

    // Filter to brands we want to delete with 0 inventory
    const products = allProducts.filter(p =>
        BRANDS_TO_DELETE.includes(p.brand) && p.inventory_level === 0
    );

    console.log(`Found ${products.length} products to process\n`);

    if (products.length === 0) {
        console.log('No products to process. Exiting.');
        return;
    }

    const results = {
        redirectsCreated: 0,
        redirectsFailed: 0,
        deletedBC: 0,
        deletedBCFailed: 0,
        deletedSupabase: 0,
        processed: []
    };

    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const redirectTo = REDIRECT_MAP[p.brand] || REDIRECT_MAP['default'];

        console.log(`[${i + 1}/${products.length}] ${p.brand}: ${(p.name || '').substring(0, 40)}...`);

        if (DRY_RUN) {
            console.log(`  Would redirect to: ${redirectTo}`);
            console.log(`  Would delete from BC: ${p.product_id}`);
            results.processed.push({ brand: p.brand, sku: p.sku, action: 'dry_run' });
            continue;
        }

        // Get product URL for redirect
        let fromUrl = p.custom_url;
        if (!fromUrl) {
            fromUrl = await getProductUrl(p.product_id);
            await sleep(100);
        }

        // Create 301 redirect
        if (fromUrl) {
            const redirected = await createRedirect(fromUrl, redirectTo);
            if (redirected) {
                results.redirectsCreated++;
                console.log(`  ✓ Redirect: ${fromUrl} → ${redirectTo}`);
            } else {
                results.redirectsFailed++;
                console.log(`  ✗ Redirect failed for ${fromUrl}`);
            }
            await sleep(100);
        }

        // Delete from BigCommerce
        const deleted = await deleteFromBC(p.product_id);
        if (deleted) {
            results.deletedBC++;
            console.log(`  ✓ Deleted from BC: ${p.product_id}`);
        } else {
            results.deletedBCFailed++;
            console.log(`  ✗ BC delete failed: ${p.product_id}`);
        }
        await sleep(100);

        // Delete from Supabase
        const supDeleted = supabaseDelete('ecommerce_products', p.id);
        if (supDeleted) {
            results.deletedSupabase++;
            console.log(`  ✓ Deleted from Supabase`);
        }

        results.processed.push({ brand: p.brand, sku: p.sku, product_id: p.product_id, action: 'deleted' });

        // Rate limit protection
        await sleep(150);
    }

    console.log('\n' + '='.repeat(70));
    console.log('RESULTS');
    console.log('='.repeat(70));
    console.log(`Products processed: ${products.length}`);
    console.log(`Redirects created: ${results.redirectsCreated}`);
    console.log(`Redirects failed: ${results.redirectsFailed}`);
    console.log(`Deleted from BC: ${results.deletedBC}`);
    console.log(`BC deletes failed: ${results.deletedBCFailed}`);
    console.log(`Deleted from Supabase: ${results.deletedSupabase}`);

    // Save report
    const report = {
        timestamp: new Date().toISOString(),
        dry_run: DRY_RUN,
        brands_processed: BRANDS_TO_DELETE.length,
        excluded: ['Allan K Suttons'],
        results,
        products_count: products.length
    };
    fs.writeFileSync('./unlinked-brands-deletion-report.json', JSON.stringify(report, null, 2));
    console.log('\nReport saved to: unlinked-brands-deletion-report.json');
}

main().catch(err => console.error('Error:', err));
