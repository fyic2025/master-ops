import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function deepDive() {
  const connection = await mysql.createConnection({
    host: process.env.AWS_RDS_NEWSYNC6_HOST,
    port: parseInt(process.env.AWS_RDS_NEWSYNC6_PORT || '3306'),
    user: process.env.AWS_RDS_NEWSYNC6_USER,
    password: process.env.AWS_RDS_NEWSYNC6_PASSWORD,
  });

  let report = '';

  try {
    report += '# COMPLETE AWS DATABASE DEEP DIVE\n\n';
    report += '**Date:** ' + new Date().toISOString() + '\n';
    report += '**Instance:** newsync6.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com\n\n';
    report += '---\n\n';

    // ============================================================================
    // DATABASE: new_fyic_db (THE INTERESTING ONE!)
    // ============================================================================

    console.log('🔍 DEEP DIVE: new_fyic_db...\n');
    report += '# DATABASE: new_fyic_db\n\n';

    await connection.query('USE new_fyic_db');

    // Get all table structures
    const [tables] = await connection.query('SHOW TABLES');
    report += `**Total Tables:** ${(tables as any[]).length}\n\n`;

    // CRITICAL: Check the crons table first
    console.log('📋 Analyzing CRONS table (sync job logs)...');
    report += '## 🎯 CRONS Table (Sync Job Execution Logs)\n\n';

    const [cronsSchema] = await connection.query('DESCRIBE crons');
    report += '**Schema:**\n\n';
    report += '| Field | Type | Null | Key |\n|-------|------|------|-----|\n';
    (cronsSchema as any[]).forEach(col => {
      report += `| ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key || ''} |\n`;
    });

    // Get recent cron executions
    const [recentCrons] = await connection.query('SELECT * FROM crons ORDER BY id DESC LIMIT 20');
    report += '\n**Recent Cron Executions (last 20):**\n\n```json\n';
    report += JSON.stringify(recentCrons, null, 2);
    report += '\n```\n\n';

    // Get cron stats by type
    const [cronStats] = await connection.query(`
      SELECT
        JSON_EXTRACT(cron_data, '$.type') as cron_type,
        COUNT(*) as execution_count,
        MAX(created_at) as last_run,
        MIN(created_at) as first_run
      FROM crons
      WHERE cron_data IS NOT NULL
      GROUP BY cron_type
      ORDER BY execution_count DESC
    `);
    report += '**Cron Job Statistics:**\n\n';
    report += '| Job Type | Executions | Last Run | First Run |\n';
    report += '|----------|------------|----------|----------|\n';
    (cronStats as any[]).forEach(stat => {
      report += `| ${stat.cron_type} | ${stat.execution_count} | ${stat.last_run} | ${stat.first_run} |\n`;
    });
    report += '\n\n';

    // Analyze bc_products
    console.log('📦 Analyzing bc_products...');
    report += '## BigCommerce Products (bc_products)\n\n';

    const [bcProdsSchema] = await connection.query('DESCRIBE bc_products');
    report += '**Schema:**\n\n';
    report += '| Field | Type | Null | Key |\n|-------|------|------|-----|\n';
    (bcProdsSchema as any[]).forEach(col => {
      report += `| ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key || ''} |\n`;
    });

    const [bcSample] = await connection.query('SELECT * FROM bc_products LIMIT 5');
    report += '\n**Sample Products:**\n\n```json\n';
    report += JSON.stringify(bcSample, null, 2);
    report += '\n```\n\n';

    // Analyze bc_orders
    console.log('🛒 Analyzing bc_orders (157K orders!)...');
    report += '## BigCommerce Orders (bc_orders)\n\n';

    const [orderStats] = await connection.query(`
      SELECT
        COUNT(*) as total_orders,
        MIN(created_at) as first_order,
        MAX(created_at) as last_order,
        SUM(total_inc_tax) as total_revenue
      FROM bc_orders
    `);
    report += '**Order Statistics:**\n\n';
    report += JSON.stringify(orderStats, null, 2);
    report += '\n\n';

    const [orderSample] = await connection.query('SELECT * FROM bc_orders ORDER BY created_at DESC LIMIT 3');
    report += '**Recent Orders (sample):**\n\n```json\n';
    report += JSON.stringify(orderSample, null, 2);
    report += '\n```\n\n';

    // Analyze oborne_stocks (3.4M rows!)
    console.log('📊 Analyzing oborne_stocks (3.4M rows - historical tracking)...');
    report += '## Oborne Stock History (oborne_stocks)\n\n';
    report += '**Rows:** 3,430,395 (historical stock level tracking)\n\n';

    const [stockStats] = await connection.query(`
      SELECT
        COUNT(DISTINCT prod_id) as unique_products,
        MIN(created_at) as oldest_record,
        MAX(created_at) as newest_record
      FROM oborne_stocks
    `);
    report += '**Stock History Stats:**\n\n';
    report += JSON.stringify(stockStats, null, 2);
    report += '\n\n';

    // Check supplier product tables
    console.log('🏭 Analyzing supplier product tables...');
    report += '## Supplier Products in new_fyic_db\n\n';

    const supplierTables = ['oborne_products', 'uhp_products', 'kadac_products', 'kik_products'];
    for (const table of supplierTables) {
      const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      const rowCount = (count as any)[0].count;
      report += `### ${table}\n\n`;
      report += `**Rows:** ${rowCount}\n\n`;

      const [sample] = await connection.query(`SELECT * FROM ${table} LIMIT 3`);
      report += '**Sample:**\n\n```json\n';
      report += JSON.stringify(sample, null, 2);
      report += '\n```\n\n';
    }

    // Check AI improvement tables
    console.log('🤖 Analyzing AI improvement tables...');
    report += '## AI-Enhanced Product Descriptions\n\n';

    const aiTables = [
      'bc_improved_ai_score',
      'bc_cat_improved_ai_score',
      'uhp_improved_ai_score',
      'ob_improved_ai_score',
      'kad_improved_ai_score'
    ];

    for (const table of aiTables) {
      const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      const rowCount = (count as any)[0].count;
      if (rowCount > 0) {
        report += `- **${table}**: ${rowCount} improved descriptions\n`;
      }
    }
    report += '\n\n';

    // Check Klaviyo profiles
    console.log('📧 Analyzing Klaviyo email profiles...');
    report += '## Marketing - Klaviyo Profiles\n\n';

    const [klaviyoStats] = await connection.query(`
      SELECT
        COUNT(*) as total_profiles,
        COUNT(DISTINCT email) as unique_emails
      FROM klaviyo_profiles
    `);
    report += JSON.stringify(klaviyoStats, null, 2);
    report += '\n\n';

    // Check settings
    const [settings] = await connection.query('SELECT * FROM settings');
    report += '## System Settings\n\n```json\n';
    report += JSON.stringify(settings, null, 2);
    report += '\n```\n\n';

    // ============================================================================
    // Now check if we can access newsync5 (older instance)
    // ============================================================================

    console.log('\n🔍 Attempting to connect to newsync5 (older RDS)...');

    let newsync5Report = '\n\n---\n\n# DATABASE INSTANCE: newsync5\n\n';

    try {
      const newsync5 = await mysql.createConnection({
        host: 'newsync5.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com',
        port: 3306,
        user: process.env.AWS_RDS_NEWSYNC6_USER,
        password: process.env.AWS_RDS_NEWSYNC6_PASSWORD,
      });

      const [ns5databases] = await newsync5.query('SHOW DATABASES');
      newsync5Report += '**Accessible:** ✅ YES\n\n';
      newsync5Report += '**Databases:**\n\n```json\n';
      newsync5Report += JSON.stringify(ns5databases, null, 2);
      newsync5Report += '\n```\n\n';

      await newsync5.end();
    } catch (error) {
      newsync5Report += '**Accessible:** ❌ NO (private subnet or different password)\n\n';
      newsync5Report += '**Error:** ' + (error as Error).message + '\n\n';
    }

    report += newsync5Report;

    // Save report
    fs.writeFileSync('/root/master-ops/buy-organics-online/COMPLETE-DEEP-DIVE.md', report);
    console.log('\n✅ Complete report saved to buy-organics-online/COMPLETE-DEEP-DIVE.md');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

deepDive().catch(console.error);
