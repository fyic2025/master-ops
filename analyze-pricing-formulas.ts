import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function analyzePricing() {
  const connection = await mysql.createConnection({
    host: process.env.AWS_RDS_NEWSYNC6_HOST,
    port: parseInt(process.env.AWS_RDS_NEWSYNC6_PORT || '3306'),
    user: process.env.AWS_RDS_NEWSYNC6_USER,
    password: process.env.AWS_RDS_NEWSYNC6_PASSWORD,
  });

  let report = '';
  report += '# PRICING FORMULA ANALYSIS\n\n';
  report += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
  report += '**Objective:** Reverse-engineer pricing markup formulas by comparing supplier wholesale to BigCommerce retail prices\n\n';
  report += '---\n\n';

  try {
    await connection.query('USE new_fyic_db');

    // ========================================================================
    // 1. OBORNE PRODUCTS PRICING ANALYSIS
    // ========================================================================
    console.log('📊 Analyzing Oborne pricing patterns...\n');
    report += '## 🏭 OBORNE PRODUCTS PRICING\n\n';

    // Get Oborne products with pricing
    const [oborneSample] = await connection.query(`
      SELECT
        op.sku,
        op.name,
        op.ws_ex_gst as wholesale_price,
        op.rrp as suggested_rrp,
        bp.sku as bc_sku,
        bp.name as bc_name,
        bp.price as bc_retail_price,
        bp.cost_price as bc_cost_price,
        ROUND((bp.price / op.ws_ex_gst), 2) as markup_ratio,
        ROUND(((bp.price - op.ws_ex_gst) / op.ws_ex_gst * 100), 2) as markup_percentage
      FROM oborne_products op
      LEFT JOIN bc_products bp ON CONCAT('OB - ', op.sku) = bp.sku
      WHERE bp.price IS NOT NULL
        AND op.ws_ex_gst > 0
      LIMIT 50
    `);

    report += '**Sample Price Comparisons:**\n\n';
    report += '| SKU | Wholesale | BC Price | Markup Ratio | Markup % |\n';
    report += '|-----|-----------|----------|--------------|----------|\n';

    (oborneSample as any[]).forEach(row => {
      report += `| ${row.sku} | $${parseFloat(row.wholesale_price).toFixed(2)} | $${parseFloat(row.bc_retail_price).toFixed(2)} | ${row.markup_ratio}x | ${row.markup_percentage}% |\n`;
    });
    report += '\n';

    // Get markup statistics
    const [oborneStats] = await connection.query(`
      SELECT
        COUNT(*) as total_matched,
        MIN(bp.price / op.ws_ex_gst) as min_markup,
        MAX(bp.price / op.ws_ex_gst) as max_markup,
        AVG(bp.price / op.ws_ex_gst) as avg_markup,
        STDDEV(bp.price / op.ws_ex_gst) as stddev_markup
      FROM oborne_products op
      LEFT JOIN bc_products bp ON CONCAT('OB - ', op.sku) = bp.sku
      WHERE bp.price IS NOT NULL AND op.ws_ex_gst > 0
    `);

    report += '**Oborne Markup Statistics:**\n\n';
    report += '```json\n';
    report += JSON.stringify(oborneStats, null, 2);
    report += '\n```\n\n';

    // ========================================================================
    // 2. UHP PRODUCTS PRICING ANALYSIS
    // ========================================================================
    console.log('📊 Analyzing UHP pricing patterns...\n');
    report += '## 🏭 UHP PRODUCTS PRICING\n\n';

    const [uhpSample] = await connection.query(`
      SELECT
        up.sku,
        up.description,
        up.ws_ex_gst as wholesale_price,
        up.rrp as suggested_rrp,
        bp.sku as bc_sku,
        bp.price as bc_retail_price,
        ROUND((bp.price / up.ws_ex_gst), 2) as markup_ratio,
        ROUND(((bp.price - up.ws_ex_gst) / up.ws_ex_gst * 100), 2) as markup_percentage
      FROM uhp_products up
      LEFT JOIN bc_products bp ON CONCAT('UHP - ', up.sku) = bp.sku
      WHERE bp.price IS NOT NULL
        AND up.ws_ex_gst > 0
      LIMIT 30
    `);

    report += '**Sample Price Comparisons:**\n\n';
    report += '| SKU | Wholesale | BC Price | Markup Ratio | Markup % |\n';
    report += '|-----|-----------|----------|--------------|----------|\n';

    (uhpSample as any[]).forEach(row => {
      report += `| ${row.sku} | $${parseFloat(row.wholesale_price).toFixed(2)} | $${parseFloat(row.bc_retail_price).toFixed(2)} | ${row.markup_ratio}x | ${row.markup_percentage}% |\n`;
    });
    report += '\n';

    const [uhpStats] = await connection.query(`
      SELECT
        COUNT(*) as total_matched,
        MIN(bp.price / up.ws_ex_gst) as min_markup,
        MAX(bp.price / up.ws_ex_gst) as max_markup,
        AVG(bp.price / up.ws_ex_gst) as avg_markup,
        STDDEV(bp.price / up.ws_ex_gst) as stddev_markup
      FROM uhp_products up
      LEFT JOIN bc_products bp ON CONCAT('UHP - ', up.sku) = bp.sku
      WHERE bp.price IS NOT NULL AND up.ws_ex_gst > 0
    `);

    report += '**UHP Markup Statistics:**\n\n';
    report += '```json\n';
    report += JSON.stringify(uhpStats, null, 2);
    report += '\n```\n\n';

    // ========================================================================
    // 3. KADAC PRODUCTS PRICING ANALYSIS
    // ========================================================================
    console.log('📊 Analyzing Kadac pricing patterns...\n');
    report += '## 🏭 KADAC PRODUCTS PRICING\n\n';

    const [kadacSample] = await connection.query(`
      SELECT
        kp.sku,
        kp.description,
        kp.wholesale as wholesale_price,
        kp.rrp as suggested_rrp,
        bp.sku as bc_sku,
        bp.price as bc_retail_price,
        ROUND((bp.price / kp.wholesale), 2) as markup_ratio,
        ROUND(((bp.price - kp.wholesale) / kp.wholesale * 100), 2) as markup_percentage
      FROM kadac_products kp
      LEFT JOIN bc_products bp ON CONCAT('KAD - ', kp.sku) = bp.sku
      WHERE bp.price IS NOT NULL
        AND kp.wholesale > 0
      LIMIT 30
    `);

    report += '**Sample Price Comparisons:**\n\n';
    report += '| SKU | Wholesale | BC Price | Markup Ratio | Markup % |\n';
    report += '|-----|-----------|----------|--------------|----------|\n';

    (kadacSample as any[]).forEach(row => {
      report += `| ${row.sku} | $${parseFloat(row.wholesale_price).toFixed(2)} | $${parseFloat(row.bc_retail_price).toFixed(2)} | ${row.markup_ratio}x | ${row.markup_percentage}% |\n`;
    });
    report += '\n';

    const [kadacStats] = await connection.query(`
      SELECT
        COUNT(*) as total_matched,
        MIN(bp.price / kp.wholesale) as min_markup,
        MAX(bp.price / kp.wholesale) as max_markup,
        AVG(bp.price / kp.wholesale) as avg_markup
      FROM kadac_products kp
      LEFT JOIN bc_products bp ON CONCAT('KAD - ', kp.sku) = bp.sku
      WHERE bp.price IS NOT NULL AND kp.wholesale > 0
    `);

    report += '**Kadac Markup Statistics:**\n\n';
    report += '```json\n';
    report += JSON.stringify(kadacStats, null, 2);
    report += '\n```\n\n';

    // ========================================================================
    // 4. PRICE TIER ANALYSIS
    // ========================================================================
    console.log('📊 Analyzing pricing tiers...\n');
    report += '## 📊 PRICING TIER ANALYSIS\n\n';
    report += 'Analyzing if different price ranges use different markup formulas...\n\n';

    const [priceTiers] = await connection.query(`
      SELECT
        CASE
          WHEN op.ws_ex_gst < 5 THEN 'Tier 1: Under $5'
          WHEN op.ws_ex_gst >= 5 AND op.ws_ex_gst < 20 THEN 'Tier 2: $5-$20'
          WHEN op.ws_ex_gst >= 20 AND op.ws_ex_gst < 50 THEN 'Tier 3: $20-$50'
          WHEN op.ws_ex_gst >= 50 AND op.ws_ex_gst < 100 THEN 'Tier 4: $50-$100'
          ELSE 'Tier 5: Over $100'
        END as price_tier,
        COUNT(*) as product_count,
        ROUND(AVG(bp.price / op.ws_ex_gst), 2) as avg_markup,
        ROUND(MIN(bp.price / op.ws_ex_gst), 2) as min_markup,
        ROUND(MAX(bp.price / op.ws_ex_gst), 2) as max_markup
      FROM oborne_products op
      LEFT JOIN bc_products bp ON CONCAT('OB - ', op.sku) = bp.sku
      WHERE bp.price IS NOT NULL AND op.ws_ex_gst > 0
      GROUP BY price_tier
      ORDER BY MIN(op.ws_ex_gst)
    `);

    report += '**Markup by Price Tier (Oborne):**\n\n';
    report += '| Price Tier | Products | Avg Markup | Min | Max |\n';
    report += '|------------|----------|------------|-----|-----|\n';

    (priceTiers as any[]).forEach(row => {
      report += `| ${row.price_tier} | ${row.product_count} | ${row.avg_markup}x | ${row.min_markup}x | ${row.max_markup}x |\n`;
    });
    report += '\n';

    // ========================================================================
    // 5. CHECK FOR PRICING RULES IN DATABASE
    // ========================================================================
    console.log('🔍 Looking for pricing rules in database...\n');
    report += '## 🔍 PRICING RULES SEARCH\n\n';

    // Check settings table
    const [settings] = await connection.query('SELECT * FROM settings');
    report += '**Settings Table:**\n\n```json\n';
    report += JSON.stringify(settings, null, 2);
    report += '\n```\n\n';

    // ========================================================================
    // 6. SUPPLIER COMPARISON
    // ========================================================================
    console.log('📊 Comparing markup across all suppliers...\n');
    report += '## 📊 CROSS-SUPPLIER COMPARISON\n\n';

    const suppliers = [
      { name: 'Oborne', prefix: 'OB', table: 'oborne_products', priceCol: 'ws_ex_gst' },
      { name: 'UHP', prefix: 'UHP', table: 'uhp_products', priceCol: 'ws_ex_gst' },
      { name: 'Kadac', prefix: 'KAD', table: 'kadac_products', priceCol: 'wholesale' }
    ];

    report += '| Supplier | Matched Products | Avg Markup | Min | Max |\n';
    report += '|----------|-----------------|------------|-----|-----|\n';

    for (const supplier of suppliers) {
      try {
        const [stats] = await connection.query(`
          SELECT
            COUNT(*) as total_matched,
            ROUND(AVG(bp.price / sp.${supplier.priceCol}), 2) as avg_markup,
            ROUND(MIN(bp.price / sp.${supplier.priceCol}), 2) as min_markup,
            ROUND(MAX(bp.price / sp.${supplier.priceCol}), 2) as max_markup
          FROM ${supplier.table} sp
          LEFT JOIN bc_products bp ON CONCAT('${supplier.prefix} - ', sp.sku) = bp.sku
          WHERE bp.price IS NOT NULL AND sp.${supplier.priceCol} > 0
        `);

        const s = (stats as any)[0];
        report += `| ${supplier.name} | ${s.total_matched} | ${s.avg_markup}x | ${s.min_markup}x | ${s.max_markup}x |\n`;
      } catch (e) {
        report += `| ${supplier.name} | Error: ${(e as Error).message} | - | - | - |\n`;
      }
    }
    report += '\n';

    // ========================================================================
    // 7. CONCLUSIONS AND RECOMMENDATIONS
    // ========================================================================
    report += '---\n\n## 🎯 CONCLUSIONS\n\n';
    report += 'Based on the analysis above:\n\n';
    report += '1. **Markup patterns identified** - Calculate average markup per supplier\n';
    report += '2. **Price tier variations** - Check if cheaper products have higher markup\n';
    report += '3. **RRP comparison** - See if supplier RRP is used vs custom markup\n';
    report += '4. **Outliers** - Identify products with unusual pricing that may be manual\n\n';
    report += '### Next Steps:\n\n';
    report += '- [ ] Validate pricing formula against recent price changes\n';
    report += '- [ ] Check if promotional pricing exists in database\n';
    report += '- [ ] Document any category-specific pricing rules\n';
    report += '- [ ] Identify minimum advertised price (MAP) constraints\n\n';

    // Save report
    fs.writeFileSync('/root/master-ops/buy-organics-online/PRICING-ANALYSIS.md', report);
    console.log('\n✅ Pricing analysis saved: buy-organics-online/PRICING-ANALYSIS.md');

  } finally {
    await connection.end();
  }
}

analyzePricing().catch(console.error);
