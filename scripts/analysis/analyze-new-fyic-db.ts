import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function analyzeNewFyicDb() {
  const connection = await mysql.createConnection({
    host: process.env.AWS_RDS_NEWSYNC6_HOST,
    port: parseInt(process.env.AWS_RDS_NEWSYNC6_PORT || '3306'),
    user: process.env.AWS_RDS_NEWSYNC6_USER,
    password: process.env.AWS_RDS_NEWSYNC6_PASSWORD,
  });

  let report = '';

  try {
    await connection.query('USE new_fyic_db');

    report += '# COMPLETE ANALYSIS: new_fyic_db\n\n';
    report += '**Date:** ' + new Date().toISOString().split('T')[0] + '\n\n';
    report += '---\n\n';

    // ============================================================================
    // 1. CRONS TABLE - SYNC JOB LOGS
    // ============================================================================
    console.log('📋 Analyzing CRONS table...');
    report += '## 🎯 CRONS Table (Sync Job Logs)\n\n';

    const [cronsSchema] = await connection.query('DESCRIBE crons');
    report += '**Schema:**\n\n';
    report += '| Field | Type | Null | Key | Default | Extra |\n';
    report += '|-------|------|------|-----|---------|-------|\n';
    (cronsSchema as any[]).forEach(col => {
      report += `| ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key || ''} | ${col.Default || ''} | ${col.Extra || ''} |\n`;
    });
    report += '\n';

    // Get recent crons
    const [recentCrons] = await connection.query('SELECT * FROM crons ORDER BY id DESC LIMIT 30');
    report += '**Recent Cron Executions (last 30):**\n\n```json\n';
    report += JSON.stringify(recentCrons, null, 2);
    report += '\n```\n\n';

    // Get oldest and newest
    const [cronRange] = await connection.query(`
      SELECT
        MIN(created_at) as first_execution,
        MAX(created_at) as last_execution,
        COUNT(*) as total_executions
      FROM crons
    `);
    report += '**Execution Range:**\n\n';
    report += JSON.stringify(cronRange, null, 2);
    report += '\n\n';

    // ============================================================================
    // 2. BC_PRODUCTS - BIGCOMMERCE PRODUCTS
    // ============================================================================
    console.log('📦 Analyzing bc_products...');
    report += '---\n\n## 📦 BC_PRODUCTS (BigCommerce Products)\n\n';

    const [bcSchema] = await connection.query('DESCRIBE bc_products');
    report += '**Schema:**\n\n';
    report += '| Field | Type | Null | Key |\n|-------|------|------|-----|\n';
    (bcSchema as any[]).forEach(col => {
      report += `| ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key || ''} |\n`;
    });
    report += '\n';

    const [bcSample] = await connection.query('SELECT * FROM bc_products LIMIT 5');
    report += '**Sample Products:**\n\n```json\n';
    report += JSON.stringify(bcSample, null, 2);
    report += '\n```\n\n';

    const [bcStats] = await connection.query(`
      SELECT
        COUNT(*) as total_products,
        COUNT(DISTINCT sku) as unique_skus,
        COUNT(DISTINCT brand) as unique_brands,
        SUM(CASE WHEN is_visible = 1 THEN 1 ELSE 0 END) as visible_products,
        AVG(price) as avg_price
      FROM bc_products
    `);
    report += '**Product Statistics:**\n\n';
    report += JSON.stringify(bcStats, null, 2);
    report += '\n\n';

    // ============================================================================
    // 3. BC_ORDERS - ORDER HISTORY
    // ============================================================================
    console.log('🛒 Analyzing bc_orders...');
    report += '---\n\n## 🛒 BC_ORDERS (Order History - 157K orders!)\n\n';

    const [orderSchema] = await connection.query('DESCRIBE bc_orders');
    report += '**Schema:**\n\n';
    report += '| Field | Type |\n|-------|------|\n';
    (orderSchema as any[]).forEach(col => {
      report += `| ${col.Field} | ${col.Type} |\n`;
    });
    report += '\n';

    const [orderStats] = await connection.query(`
      SELECT
        COUNT(*) as total_orders,
        MIN(DATE(created_at)) as first_order_date,
        MAX(DATE(created_at)) as last_order_date,
        SUM(total_inc_tax) as total_revenue,
        AVG(total_inc_tax) as avg_order_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM bc_orders
    `);
    report += '**Order Statistics:**\n\n';
    report += JSON.stringify(orderStats, null, 2);
    report += '\n\n';

    // Orders by month (last 12 months)
    const [monthlyOrders] = await connection.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as order_count,
        SUM(total_inc_tax) as revenue
      FROM bc_orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month DESC
    `);
    report += '**Monthly Order Trends (last 12 months):**\n\n';
    report += '| Month | Orders | Revenue |\n|-------|--------|--------|\n';
    (monthlyOrders as any[]).forEach(row => {
      report += `| ${row.month} | ${row.order_count} | $${parseFloat(row.revenue || 0).toFixed(2)} |\n`;
    });
    report += '\n\n';

    // ============================================================================
    // 4. OBORNE_STOCKS - MASSIVE HISTORICAL DATA
    // ============================================================================
    console.log('📊 Analyzing oborne_stocks (3.4M rows)...');
    report += '---\n\n## 📊 OBORNE_STOCKS (Historical Stock Tracking)\n\n';
    report += '**Rows:** 3,430,395 (massive historical tracking)\n\n';

    const [stockSchema] = await connection.query('DESCRIBE oborne_stocks');
    report += '**Schema:**\n\n';
    report += '| Field | Type |\n|-------|------|\n';
    (stockSchema as any[]).forEach(col => {
      report += `| ${col.Field} | ${col.Type} |\n`;
    });
    report += '\n';

    const [stockStats] = await connection.query(`
      SELECT
        COUNT(DISTINCT prod_id) as tracked_products,
        MIN(created_at) as oldest_record,
        MAX(created_at) as newest_record,
        COUNT(*) / COUNT(DISTINCT prod_id) as avg_records_per_product
      FROM oborne_stocks
      LIMIT 1
    `);
    report += '**Stock History Stats:**\n\n';
    report += JSON.stringify(stockStats, null, 2);
    report += '\n\n';

    const [stockSample] = await connection.query('SELECT * FROM oborne_stocks ORDER BY created_at DESC LIMIT 5');
    report += '**Recent Stock Updates:**\n\n```json\n';
    report += JSON.stringify(stockSample, null, 2);
    report += '\n```\n\n';

    // ============================================================================
    // 5. SUPPLIER PRODUCTS
    // ============================================================================
    console.log('🏭 Analyzing supplier products...');
    report += '---\n\n## 🏭 SUPPLIER PRODUCTS\n\n';

    const suppliers = [
      { name: 'oborne_products', count: 8570 },
      { name: 'uhp_products', count: 4501 },
      { name: 'kadac_products', count: 945 },
      { name: 'kik_products', count: 424 }
    ];

    for (const supplier of suppliers) {
      report += `### ${supplier.name} (${supplier.count} products)\n\n`;

      const [schema] = await connection.query(`DESCRIBE ${supplier.name}`);
      report += '**Schema:**\n\n';
      const fields = (schema as any[]).map(col => col.Field).join(', ');
      report += `${fields}\n\n`;

      const [sample] = await connection.query(`SELECT * FROM ${supplier.name} LIMIT 2`);
      report += '**Sample:**\n\n```json\n';
      report += JSON.stringify(sample, null, 2);
      report += '\n```\n\n';
    }

    // ============================================================================
    // 6. AI ENHANCEMENT TABLES
    // ============================================================================
    console.log('🤖 Analyzing AI enhancements...');
    report += '---\n\n## 🤖 AI-Enhanced Product Content\n\n';

    const aiTables = ['bc_improved_ai_score', 'bc_cat_improved_ai_score', 'uhp_improved_ai_score'];

    for (const table of aiTables) {
      const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      const rowCount = (count as any)[0].count;

      if (rowCount > 0) {
        report += `### ${table} (${rowCount} rows)\n\n`;

        const [schema] = await connection.query(`DESCRIBE ${table}`);
        const fields = (schema as any[]).map(col => col.Field).join(', ');
        report += `**Fields:** ${fields}\n\n`;

        const [sample] = await connection.query(`SELECT * FROM ${table} LIMIT 2`);
        report += '```json\n' + JSON.stringify(sample, null, 2) + '\n```\n\n';
      }
    }

    // ============================================================================
    // 7. KLAVIYO EMAIL PROFILES
    // ============================================================================
    console.log('📧 Analyzing Klaviyo profiles...');
    report += '---\n\n## 📧 KLAVIYO_PROFILES (Email Marketing)\n\n';

    const [klaviyoStats] = await connection.query(`
      SELECT
        COUNT(*) as total_profiles,
        COUNT(DISTINCT email) as unique_emails,
        COUNT(DISTINCT phone_number) as profiles_with_phone
      FROM klaviyo_profiles
    `);
    report += JSON.stringify(klaviyoStats, null, 2);
    report += '\n\n';

    // ============================================================================
    // 8. SETTINGS
    // ============================================================================
    const [settings] = await connection.query('SELECT * FROM settings');
    report += '---\n\n## ⚙️ SYSTEM SETTINGS\n\n```json\n';
    report += JSON.stringify(settings, null, 2);
    report += '\n```\n\n';

    // ============================================================================
    // 9. SHOPIFY ORDERS (Teelixir?)
    // ============================================================================
    console.log('🛍️ Analyzing Shopify orders...');
    report += '---\n\n## 🛍️ SHOPIFY_ORDERS (Teelixir Orders?)\n\n';

    const [shopifyStats] = await connection.query(`
      SELECT
        COUNT(*) as total_orders,
        MIN(created_at) as first_order,
        MAX(created_at) as last_order
      FROM shopify_orders
    `);
    report += JSON.stringify(shopifyStats, null, 2);
    report += '\n\n';

    // Save report
    fs.writeFileSync('/root/master-ops/buy-organics-online/NEW-FYIC-DB-ANALYSIS.md', report);
    console.log('\n✅ Report saved: buy-organics-online/NEW-FYIC-DB-ANALYSIS.md');

  } finally {
    await connection.end();
  }
}

analyzeNewFyicDb().catch(console.error);
