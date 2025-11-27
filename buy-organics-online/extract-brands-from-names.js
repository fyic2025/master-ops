// Extract brands from product names in deletion candidates
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./deletion-candidates.json', 'utf8'));

// Common brand patterns in product names
const brandPatterns = [
    // Extract from product name patterns like "Brand Product Name"
    /^(Acure|Alaffia|Giovanni|Weleda|Dr Organic|Desert Essence|Kiss My Face|Alba Botanica|Avalon Organics)/i,
    /^(Enviro Products|Biome|EcoStore|Method|Earth Choice|Ecover|Seventh Generation)/i,
    /^(Jason|Andalou|Yes To|Burt's Bees|Sukin|Trilogy|A'kin)/i,
    /^(Lotus|Global Organics|Absolute Organic|Ceres|Spiral|Pure Harvest)/i,
    /^(Red Seal|Grants|Sante|Eco|Green Beaver|Nature's Gate)/i,
    /^(Jack N|Plantasy|Nutralife|Radiance|Thompson's|Blackmores)/i,
    /^(Now Foods|Source Naturals|Nature's Way|Herbs of Gold|Fusion)/i,
    /^(Hanami|Naturtint|Herbatint|Tints of Nature)/i,
    /^(Wotnot|Little Innoscents|Gaia|Cherub Rubs|MooGoo)/i,
];

// Count products by detected brand and inventory status
const brandStats = {};
const skuPrefixStats = {};

data.products.forEach(p => {
    // Try to detect brand from name
    let detectedBrand = 'Unknown';
    const name = p.name || '';

    // Common brand extractions
    const brandMatches = [
        name.match(/^([\w']+(?:\s+[\w']+)?)\s+(?:Organic|Natural|Pure|Raw|Original)/i),
        name.match(/^(Acure|Alaffia|Giovanni|Weleda|Dr\s*Organic|Desert\s*Essence)/i),
        name.match(/^(Enviro\s*Products?|EcoStore|Method|Ecover)/i),
        name.match(/^(Jason|Andalou|Sukin|Trilogy|A'kin)/i),
        name.match(/^(Lotus|Global\s*Organics|Ceres|Spiral|Pure\s*Harvest)/i),
        name.match(/^(Red\s*Seal|Grants|Green\s*Beaver)/i),
        name.match(/^(Jack\s*N'\s*Jill|Plantasy|Now\s*Foods)/i),
        name.match(/^(Hanami|Naturtint|Herbatint)/i),
        name.match(/^(Wotnot|Little\s*Innoscents|Gaia|MooGoo)/i),
        name.match(/^(Natracare|TOM\s*Organic|Cottons)/i),
        name.match(/^(Montville|Griffiths|Bundaberg|Melrose)/i),
        name.match(/^(Amazonia|Macro\s*Mike|Nutra\s*Organics)/i),
    ];

    for (const match of brandMatches) {
        if (match) {
            detectedBrand = match[1].trim();
            break;
        }
    }

    // Use first 1-2 words if no pattern match and name is reasonable
    if (detectedBrand === 'Unknown' && name && !name.startsWith('Copy')) {
        const words = name.split(/\s+/);
        if (words.length >= 2) {
            // Check if first word looks like a brand (capitalized, not a size/quantity)
            if (words[0].match(/^[A-Z][a-z]+$/) && !words[0].match(/^\d/)) {
                detectedBrand = words[0];
                // Check if second word is also part of brand name
                if (words[1] && words[1].match(/^[A-Z][a-z]+$/) && !words[1].match(/^\d/)) {
                    detectedBrand = words[0] + ' ' + words[1];
                }
            }
        }
    }

    // Track stats
    if (!brandStats[detectedBrand]) {
        brandStats[detectedBrand] = { total: 0, zero: 0, withStock: 0, samples: [] };
    }
    brandStats[detectedBrand].total++;
    if (p.inventory === 0) {
        brandStats[detectedBrand].zero++;
    } else {
        brandStats[detectedBrand].withStock++;
    }
    if (brandStats[detectedBrand].samples.length < 2) {
        brandStats[detectedBrand].samples.push({ sku: p.sku, name: p.name?.substring(0, 50), inv: p.inventory });
    }

    // SKU prefix stats
    const prefix = p.sku?.match(/^([A-Z]+)\s*-/)?.[1] || 'Other';
    if (!skuPrefixStats[prefix]) skuPrefixStats[prefix] = { total: 0, zero: 0 };
    skuPrefixStats[prefix].total++;
    if (p.inventory === 0) skuPrefixStats[prefix].zero++;
});

// Sort and display
const sorted = Object.entries(brandStats)
    .filter(([brand, stats]) => stats.total >= 5) // Only show brands with 5+ products
    .sort((a, b) => b[1].total - a[1].total);

console.log('REMAINING UNLINKED PRODUCTS - BY DETECTED BRAND');
console.log('================================================');
console.log('(Only showing brands with 5+ products)\n');
console.log('Brand'.padEnd(25) + '| Total | 0-inv | Stock | Ready to Delete?');
console.log('-'.repeat(75));

let readyToDelete = 0;
let needsReview = 0;

sorted.forEach(([brand, stats]) => {
    const canDelete = stats.withStock === 0 ? 'YES - all 0 inv' : `NO - ${stats.withStock} have stock`;
    if (stats.withStock === 0) readyToDelete += stats.total;
    else needsReview += stats.total;

    console.log(
        brand.substring(0, 24).padEnd(25) + '| ' +
        stats.total.toString().padStart(5) + ' | ' +
        stats.zero.toString().padStart(5) + ' | ' +
        stats.withStock.toString().padStart(5) + ' | ' + canDelete
    );
});

console.log('-'.repeat(75));
console.log(`\nSUMMARY:`);
console.log(`  Ready to delete (all 0 inventory): ${readyToDelete} products`);
console.log(`  Needs review (some have stock): ${needsReview} products`);

console.log('\n\nBY SKU PREFIX (Supplier):');
console.log('-'.repeat(50));
console.log('Prefix'.padEnd(10) + '| Total | 0-inv | Supplier');
console.log('-'.repeat(50));
Object.entries(skuPrefixStats)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([prefix, stats]) => {
        const supplier = {
            'OB': 'Oborne',
            'UN': 'UHP/Unleashed',
            'GBN': 'GBN Foods',
            'KIK': 'Kik (discontinued)',
            'KO': 'KO Foods',
            'BDM': 'BDM',
        }[prefix] || '?';
        console.log(
            prefix.padEnd(10) + '| ' +
            stats.total.toString().padStart(5) + ' | ' +
            stats.zero.toString().padStart(5) + ' | ' + supplier
        );
    });

// Show brands ready for immediate deletion
console.log('\n\nBRANDS READY FOR IMMEDIATE DELETION (all 0 inventory):');
console.log('-'.repeat(60));
sorted
    .filter(([brand, stats]) => stats.withStock === 0 && stats.total >= 5)
    .forEach(([brand, stats]) => {
        console.log(`  ${brand}: ${stats.total} products`);
        stats.samples.forEach(s => console.log(`    - [${s.sku}] ${s.name}`));
    });
