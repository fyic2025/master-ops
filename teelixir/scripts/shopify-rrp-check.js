#!/usr/bin/env node

const https = require('https');

const SHOP_DOMAIN = 'teelixir-au.myshopify.com';
const ACCESS_TOKEN = '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';

function shopifyRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SHOP_DOMAIN,
      path: '/admin/api/2024-01' + endpoint,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error('API Error ' + res.statusCode));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// PEARL SPECIFIC ANALYSIS
async function analyzePearl() {
  const response = await shopifyRequest('/products.json?limit=250');

  console.log('');
  console.log('='.repeat(95));
  console.log('PEARL - Complete Size Analysis (50g, 100g, 250g, 500g)');
  console.log('='.repeat(95));
  console.log('');

  // Unleashed Teelixir prices
  const unleashedTeelixir = {
    50: { sku: 'PEA-50', price: 45.45 },
    100: { sku: 'PEA-100', price: 72.73 },
    250: { sku: 'PEA-250', price: 125.00 },
    500: { sku: 'PEA-500', price: 250.00 }
  };

  // Kikai wholesale prices
  const kikaiWholesale = {
    50: { sku: 'KIK-TEE-PEA-50', price: 28.18 },
    100: { sku: 'KIK-TEE-PEA-100', price: 45.09 },
    250: { sku: 'KIK-TEE-PEA-250', price: 75.00 },
    500: { sku: 'KIK-TEE-PEA-500', price: 150.00 }
  };

  // Find Shopify prices for Pearl
  const shopifyPrices = {};
  for (const product of response.products) {
    const title = product.title.toLowerCase();
    if (!title.includes('pearl')) continue;
    if (title.includes('box')) continue;
    if (title.includes('tube')) continue;
    if (title.includes('satchel')) continue;
    if (title.includes('rm-')) continue;

    for (const v of product.variants) {
      const price = parseFloat(v.price);
      if (price === 0) continue;

      const match = product.title.match(/(\d+)\s*(g|kg)/i);
      if (match) {
        let size = parseInt(match[1]);
        if (match[2].toLowerCase() === 'kg') size *= 1000;
        shopifyPrices[size] = { sku: v.sku, price: price, title: product.title };
      }
    }
  }

  console.log('Size     Shopify RRP    Unleashed     Kikai W/S     RRP $/g      W/S $/g      Jump vs 50g');
  console.log('-'.repeat(95));

  const sizes = [50, 100, 250, 500];
  const baseSize = 50;

  // Calculate base $/g
  const baseRRP = shopifyPrices[baseSize] ? shopifyPrices[baseSize].price : unleashedTeelixir[baseSize].price;
  const baseWS = kikaiWholesale[baseSize].price;
  const baseRRPperG = baseRRP / baseSize;
  const baseWSperG = baseWS / baseSize;

  for (const size of sizes) {
    const shopData = shopifyPrices[size];
    const unlData = unleashedTeelixir[size];
    const kikData = kikaiWholesale[size];

    const rrp = shopData ? shopData.price : unlData.price;
    const ws = kikData.price;

    const rrpPerG = rrp / size;
    const wsPerG = ws / size;

    const rrpJump = ((rrpPerG - baseRRPperG) / baseRRPperG * 100).toFixed(0);
    const wsJump = ((wsPerG - baseWSperG) / baseWSperG * 100).toFixed(0);

    console.log(
      (size + 'g').padEnd(9) +
      ('$' + rrp.toFixed(2)).padEnd(15) +
      ('$' + unlData.price.toFixed(2)).padEnd(14) +
      ('$' + ws.toFixed(2)).padEnd(14) +
      ('$' + rrpPerG.toFixed(3)).padEnd(13) +
      ('$' + wsPerG.toFixed(3)).padEnd(13) +
      (size === baseSize ? 'BASE' : rrpJump + '% / ' + wsJump + '%')
    );
  }

  console.log('');
  console.log('Tier-to-tier discounts:');
  console.log('-'.repeat(50));

  let prevRRPperG = baseRRPperG;
  let prevWSperG = baseWSperG;
  let prevSize = 50;

  for (const size of [100, 250, 500]) {
    const shopData = shopifyPrices[size];
    const unlData = unleashedTeelixir[size];
    const kikData = kikaiWholesale[size];

    const rrp = shopData ? shopData.price : unlData.price;
    const ws = kikData.price;

    const rrpPerG = rrp / size;
    const wsPerG = ws / size;

    const rrpChange = ((rrpPerG - prevRRPperG) / prevRRPperG * 100).toFixed(0);
    const wsChange = ((wsPerG - prevWSperG) / prevWSperG * 100).toFixed(0);

    const rrpFlag = parseFloat(rrpChange) >= 0 ? ' ⚠️ WRONG' : '';
    const wsFlag = parseFloat(wsChange) >= 0 ? ' ⚠️ WRONG' : '';

    console.log(prevSize + 'g → ' + size + 'g:  RRP ' + rrpChange + '%' + rrpFlag + '  |  W/S ' + wsChange + '%' + wsFlag);

    prevRRPperG = rrpPerG;
    prevWSperG = wsPerG;
    prevSize = size;
  }
}

// Run Pearl analysis if called directly
if (require.main === module) {
  analyzePearl().catch(console.error);
}

// Unleashed prices (Teelixir account)
const unleashedPrices = {
  'PEA-50': 45.45, 'PEA-100': 72.73, 'PEA-250': 125.00, 'PEA-500': 250.00,
  'TRE-50': 36.36, 'TRE-250': 100.00, 'TRE-500': 200.00, 'TRE-1000': 400.00,
  'REI-50': 36.36, 'REI-100': 58.18, 'REI-250': 100.00, 'REI-500': 200.00, 'REI-1000': 400.00,
  'CHA-50': 40.00, 'CHA-100': 63.64, 'CHA-250': 110.00, 'CHA-500': 220.00, 'CHA-1000': 484.00,
  'COR-50': 38.18, 'COR-100': 60.91, 'COR-250': 105.00, 'COR-500': 210.00, 'COR-1000': 420.00,
  'TT-50': 36.36, 'TT-100': 58.18, 'TT-250': 100.00, 'TT-500': 200.00,
  'PP-50': 34.55, 'PP-250': 95.00, 'PP-500': 190.00,
  'RES-50': 30.91, 'RES-250': 108.18,
  'PCHA-50': 32.00, 'PCHA-250': 100.00,
  'PCORD-100': 40.00, 'PCORD-500': 130.00
};

async function main() {
  const response = await shopifyRequest('/products.json?limit=250');

  console.log('FULL PRICING: Shopify RRP vs Unleashed (Teelixir)');
  console.log('='.repeat(95));
  console.log();

  const products = {};

  for (const product of response.products) {
    const title = product.title;
    const titleLower = title.toLowerCase();

    // Skip excluded products
    if (titleLower.includes('latte')) continue;
    if (titleLower.includes('immunity')) continue;
    if (titleLower.includes('lion')) continue;
    if (titleLower.includes('ashwa')) continue;
    if (titleLower.includes('box of')) continue;
    if (titleLower.includes('satchel')) continue;
    if (titleLower.includes('tube')) continue;
    if (titleLower.includes('label')) continue;
    if (titleLower.includes('tincture')) continue;
    if (title.startsWith('RM')) continue;

    // Check for target products
    const targets = ['pearl', 'tremella', 'reishi', 'chaga', 'cordyceps', 'turkey', 'pine pollen', 'resveratrol', 'pure'];
    let isTarget = false;
    for (const t of targets) {
      if (titleLower.includes(t)) {
        isTarget = true;
        break;
      }
    }
    if (!isTarget) continue;

    for (const v of product.variants) {
      const price = parseFloat(v.price);
      if (price === 0) continue;

      // Extract size
      let size = null;
      const sizeMatch = title.match(/(\d+)\s*(g|kg)/i);
      if (sizeMatch) {
        size = parseInt(sizeMatch[1]);
        if (sizeMatch[2].toLowerCase() === 'kg') size *= 1000;
      }

      if (!size) continue;

      // Group key - product base name
      let key = title
        .replace(/\d+\s*(g|kg|gm)/gi, '')
        .replace(/organic/gi, '')
        .replace(/mushroom/gi, '')
        .replace(/powder/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!products[key]) products[key] = [];

      products[key].push({
        title: title,
        sku: v.sku,
        size: size,
        shopifyRRP: price,
        unleashedPrice: unleashedPrices[v.sku] || null
      });
    }
  }

  // Sort and display
  const sortedKeys = Object.keys(products).sort();

  for (const key of sortedKeys) {
    const items = products[key].sort((a, b) => a.size - b.size);
    if (items.length < 1) continue;

    console.log(key);
    console.log('-'.repeat(95));
    console.log(
      'Size'.padEnd(8) +
      'SKU'.padEnd(18) +
      'Shopify RRP'.padEnd(14) +
      'Unleashed'.padEnd(12) +
      '$/gram'.padEnd(10) +
      'Jump vs Base'
    );
    console.log('-'.repeat(95));

    let basePerG = null;
    for (const item of items) {
      const perG = item.shopifyRRP / item.size;
      if (basePerG === null) basePerG = perG;
      const jump = ((perG - basePerG) / basePerG * 100).toFixed(0) + '%';

      console.log(
        (item.size + 'g').padEnd(8) +
        (item.sku || 'N/A').padEnd(18) +
        ('$' + item.shopifyRRP.toFixed(2)).padEnd(14) +
        (item.unleashedPrice ? '$' + item.unleashedPrice.toFixed(2) : '-').padEnd(12) +
        ('$' + perG.toFixed(3)).padEnd(10) +
        (basePerG === perG ? 'BASE' : jump)
      );
    }
    console.log();
  }

  // Summary comparison
  console.log('='.repeat(95));
  console.log('SIZE TIER ANALYSIS - Price per gram changes');
  console.log('='.repeat(95));
  console.log();
  console.log('Expected tier premiums (working back from 1kg):');
  console.log('  1kg/500g: BASE');
  console.log('  250g: +10-15% premium');
  console.log('  100g: +25-35% premium');
  console.log('  50g: +40-55% premium');
}

main().catch(console.error);
