/**
 * SEO Audit Script - Product Description Analysis
 *
 * Analyzes ecommerce_products table for:
 * - Products with no description
 * - Description formats and word counts
 * - Brand coverage
 * - Data quality baseline
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Format detection patterns
const FORMAT_PATTERNS = {
    standard: /^[\s\S]*##\s*(Key Benefits|Benefits|Ingredients|How to Use)/i,
    html_structured: /<(h[1-6]|ul|ol|div class)/i,
    plain_text: /^[^<]+$/,
    minimal_html: /^<p>[^<]+<\/p>$/,
    empty: /^(\s*|<p>\s*<\/p>|null|undefined)$/i
};

function detectFormat(description) {
    if (!description || description.trim() === '') return 'none';
    if (FORMAT_PATTERNS.empty.test(description)) return 'empty';
    if (FORMAT_PATTERNS.standard.test(description)) return 'standard';
    if (FORMAT_PATTERNS.html_structured.test(description)) return 'html_structured';
    if (FORMAT_PATTERNS.minimal_html.test(description)) return 'minimal_html';
    if (FORMAT_PATTERNS.plain_text.test(description)) return 'plain_text';
    return 'other';
}

function countWords(text) {
    if (!text) return 0;
    // Strip HTML tags
    const stripped = text.replace(/<[^>]*>/g, ' ');
    // Count words
    const words = stripped.split(/\s+/).filter(w => w.length > 0);
    return words.length;
}

async function runAudit() {
    console.log('SEO AUDIT - PRODUCT DESCRIPTIONS');
    console.log('================================\n');
    console.log('Starting audit at:', new Date().toISOString());
    console.log('');

    // Get all products with metadata
    console.log('Fetching products from Supabase...');

    const allProducts = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('ecommerce_products')
            .select('id, product_id, sku, name, brand, is_visible, metadata')
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching products:', error.message);
            return;
        }

        if (!data || data.length === 0) break;

        allProducts.push(...data);
        offset += limit;

        if (data.length < limit) break;
    }

    console.log(`Total products fetched: ${allProducts.length}\n`);

    // Analysis containers
    const stats = {
        total: allProducts.length,
        withDescription: 0,
        noDescription: 0,
        visible: 0,
        formats: {},
        wordCountRanges: {
            '0 (none)': 0,
            '1-50': 0,
            '51-100': 0,
            '101-200': 0,
            '201-500': 0,
            '500+': 0
        },
        brands: {},
        brandsWith10Plus: 0,
        productsNoDescription: []
    };

    // Process each product
    for (const product of allProducts) {
        // Get description from metadata
        const description = product.metadata?.description || '';
        const wordCount = countWords(description);
        const format = detectFormat(description);

        // Count visibility
        if (product.is_visible) stats.visible++;

        // Count descriptions
        if (wordCount > 0) {
            stats.withDescription++;
        } else {
            stats.noDescription++;
            if (product.is_visible) {
                stats.productsNoDescription.push({
                    id: product.id,
                    product_id: product.product_id,
                    sku: product.sku,
                    name: product.name,
                    brand: product.brand
                });
            }
        }

        // Format tracking
        stats.formats[format] = (stats.formats[format] || 0) + 1;

        // Word count ranges
        if (wordCount === 0) stats.wordCountRanges['0 (none)']++;
        else if (wordCount <= 50) stats.wordCountRanges['1-50']++;
        else if (wordCount <= 100) stats.wordCountRanges['51-100']++;
        else if (wordCount <= 200) stats.wordCountRanges['101-200']++;
        else if (wordCount <= 500) stats.wordCountRanges['201-500']++;
        else stats.wordCountRanges['500+']++;

        // Brand tracking
        const brand = product.brand || 'NO BRAND';
        stats.brands[brand] = (stats.brands[brand] || 0) + 1;
    }

    // Calculate brands with 10+ products
    stats.brandsWith10Plus = Object.values(stats.brands).filter(count => count >= 10).length;
    const brandCount = Object.keys(stats.brands).length;

    // Output Report
    console.log('=== SUMMARY ===\n');
    console.log(`Total Products: ${stats.total}`);
    console.log(`Visible Products: ${stats.visible}`);
    console.log(`Products WITH Description: ${stats.withDescription} (${((stats.withDescription/stats.total)*100).toFixed(1)}%)`);
    console.log(`Products WITHOUT Description: ${stats.noDescription} (${((stats.noDescription/stats.total)*100).toFixed(1)}%)`);

    console.log('\n=== DESCRIPTION FORMATS ===\n');
    Object.entries(stats.formats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([format, count]) => {
            const pct = ((count/stats.total)*100).toFixed(1);
            console.log(`  ${format.padEnd(20)} ${count.toString().padStart(6)} (${pct}%)`);
        });

    console.log('\n=== WORD COUNT DISTRIBUTION ===\n');
    Object.entries(stats.wordCountRanges).forEach(([range, count]) => {
        const pct = ((count/stats.total)*100).toFixed(1);
        console.log(`  ${range.padEnd(15)} ${count.toString().padStart(6)} (${pct}%)`);
    });

    console.log('\n=== BRAND ANALYSIS ===\n');
    console.log(`Total Unique Brands: ${brandCount}`);
    console.log(`Brands with 10+ Products: ${stats.brandsWith10Plus}`);

    // Top 20 brands
    console.log('\nTop 20 Brands by Product Count:');
    Object.entries(stats.brands)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .forEach(([brand, count], i) => {
            console.log(`  ${(i+1).toString().padStart(2)}. ${brand.padEnd(40)} ${count}`);
        });

    // Show sample of visible products with no description
    console.log('\n=== VISIBLE PRODUCTS WITHOUT DESCRIPTION (Sample) ===\n');
    const visibleNoDesc = stats.productsNoDescription.slice(0, 20);
    visibleNoDesc.forEach((p, i) => {
        console.log(`  ${(i+1).toString().padStart(2)}. [${p.sku}] ${p.name?.substring(0, 50)}...`);
    });
    if (stats.productsNoDescription.length > 20) {
        console.log(`\n  ... and ${stats.productsNoDescription.length - 20} more visible products without description`);
    }

    // Summary for SEO team baseline
    console.log('\n=== SEO TEAM BASELINE METRICS ===\n');
    console.log(`Products Classified: ~${stats.total} (need to verify categories)`);
    console.log(`Products with Description: ${stats.withDescription} (${((stats.withDescription/stats.total)*100).toFixed(1)}%)`);
    console.log(`Standard Format Applied: ${stats.formats['standard'] || 0} (${((stats.formats['standard'] || 0)/stats.total*100).toFixed(1)}%)`);
    console.log(`Brand Pages Needed: ${stats.brandsWith10Plus} brands with 10+ products`);
    console.log(`Total Brands: ${brandCount}`);

    console.log('\n================================');
    console.log('AUDIT COMPLETE');
    console.log('Completed at:', new Date().toISOString());
}

runAudit().catch(err => console.error('Error:', err.message));
