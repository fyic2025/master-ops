import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function exploreAllDatabases() {
  let fullReport = '';
  fullReport += '# COMPLETE AWS RDS INFRASTRUCTURE AUDIT\n\n';
  fullReport += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
  fullReport += `**Auditor:** Claude AI\n\n`;
  fullReport += '---\n\n';

  // ============================================================================
  // NEWSYNC6 INSTANCE
  // ============================================================================

  console.log('🔍 Connecting to NEWSYNC6...\n');
  fullReport += '# RDS INSTANCE: newsync6\n\n';
  fullReport += '**Endpoint:** newsync6.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com\n\n';

  const newsync6 = await mysql.createConnection({
    host: process.env.AWS_RDS_NEWSYNC6_HOST!,
    port: parseInt(process.env.AWS_RDS_NEWSYNC6_PORT || '3306'),
    user: process.env.AWS_RDS_NEWSYNC6_USER!,
    password: process.env.AWS_RDS_NEWSYNC6_PASSWORD!,
  });

  try {
    const [databases] = await newsync6.query('SHOW DATABASES');
    const userDbs = (databases as any[]).filter(
      db => !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(Object.values(db)[0] as string)
    );

    fullReport += `**User Databases:** ${userDbs.length}\n\n`;

    for (const dbRow of userDbs) {
      const dbName = Object.values(dbRow)[0] as string;
      console.log(`\n  📊 Database: ${dbName}`);
      fullReport += `## Database: ${dbName}\n\n`;

      await newsync6.query(`USE \`${dbName}\``);

      const [tables] = await newsync6.query('SHOW TABLES');
      const tableCount = (tables as any[]).length;
      fullReport += `**Tables:** ${tableCount}\n\n`;

      if (tableCount > 0) {
        fullReport += '| Table | Rows | Key Columns |\n|-------|------|------------|\n';

        for (const tableRow of tables as any[]) {
          const tableName = Object.values(tableRow)[0] as string;
          const [count] = await newsync6.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
          const rowCount = (count as any)[0].count;

          const [schema] = await newsync6.query(`DESCRIBE \`${tableName}\``);
          const keyColumns = (schema as any[])
            .filter((col: any) => col.Key === 'PRI' || col.Key === 'MUL')
            .map((col: any) => col.Field)
            .join(', ');

          fullReport += `| ${tableName} | ${rowCount.toLocaleString()} | ${keyColumns || '-'} |\n`;

          console.log(`      ${tableName}: ${rowCount.toLocaleString()} rows`);
        }

        fullReport += '\n';
      }

      // Special handling for key tables
      if (dbName === 'new_fyic_db') {
        console.log('\n  🎯 Deep dive: new_fyic_db key tables...');

        // CRONS table
        try {
          fullReport += '### 🔍 CRONS Table (Sync Logs)\n\n';
          const [cronsSchema] = await newsync6.query('DESCRIBE crons');
          const cronsFields = (cronsSchema as any[]).map((c: any) => c.Field).join(', ');
          fullReport += `**Columns:** ${cronsFields}\n\n`;

          const [recentCrons] = await newsync6.query('SELECT * FROM crons ORDER BY id DESC LIMIT 20');
          fullReport += '**Recent executions:**\n```json\n';
          fullReport += JSON.stringify(recentCrons, null, 2);
          fullReport += '\n```\n\n';
        } catch (e) {
          fullReport += `Error exploring crons: ${(e as Error).message}\n\n`;
        }

        // BC_PRODUCTS
        try {
          fullReport += '### 📦 BC_PRODUCTS Table\n\n';
          const [bcStats] = await newsync6.query(`
            SELECT
              COUNT(*) as total,
              COUNT(DISTINCT sku) as unique_skus
            FROM bc_products
          `);
          fullReport += JSON.stringify(bcStats, null, 2) + '\n\n';

          const [bcSample] = await newsync6.query('SELECT * FROM bc_products LIMIT 3');
          fullReport += '**Sample:**\n```json\n' + JSON.stringify(bcSample, null, 2) + '\n```\n\n';
        } catch (e) {
          fullReport += `Error exploring bc_products: ${(e as Error).message}\n\n`;
        }

        // BC_ORDERS stats
        try {
          fullReport += '### 🛒 BC_ORDERS Table\n\n';
          const [orderStats] = await newsync6.query(`
            SELECT
              COUNT(*) as total_orders,
              MIN(id) as first_order_id,
              MAX(id) as last_order_id
            FROM bc_orders
          `);
          fullReport += JSON.stringify(orderStats, null, 2) + '\n\n';
        } catch (e) {
          fullReport += `Error: ${(e as Error).message}\n\n`;
        }
      }
    }
  } finally {
    await newsync6.end();
  }

  fullReport += '\n---\n\n';

  // ============================================================================
  // NEWSYNC5 INSTANCE
  // ============================================================================

  console.log('\n🔍 Connecting to NEWSYNC5 (older instance)...\n');
  fullReport += '# RDS INSTANCE: newsync5 (older/backup instance)\n\n';
  fullReport += '**Endpoint:** newsync5.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com\n\n';

  try {
    const newsync5 = await mysql.createConnection({
      host: process.env.AWS_RDS_NEWSYNC5_HOST!,
      port: parseInt(process.env.AWS_RDS_NEWSYNC5_PORT || '3306'),
      user: process.env.AWS_RDS_NEWSYNC5_USER!,
      password: process.env.AWS_RDS_NEWSYNC5_PASSWORD!,
    });

    try {
      const [databases] = await newsync5.query('SHOW DATABASES');
      const userDbs = (databases as any[]).filter(
        db => !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(Object.values(db)[0] as string)
      );

      fullReport += `**User Databases:** ${userDbs.length}\n\n`;

      for (const dbRow of userDbs) {
        const dbName = Object.values(dbRow)[0] as string;
        console.log(`\n  📊 Database: ${dbName}`);
        fullReport += `## Database: ${dbName}\n\n`;

        await newsync5.query(`USE \`${dbName}\``);

        const [tables] = await newsync5.query('SHOW TABLES');
        const tableCount = (tables as any[]).length;
        fullReport += `**Tables:** ${tableCount}\n\n`;

        if (tableCount > 0) {
          fullReport += '| Table | Rows |\n|-------|------|\n';

          for (const tableRow of tables as any[]) {
            const tableName = Object.values(tableRow)[0] as string;
            const [count] = await newsync5.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
            const rowCount = (count as any)[0].count;

            fullReport += `| ${tableName} | ${rowCount.toLocaleString()} |\n`;
            console.log(`      ${tableName}: ${rowCount.toLocaleString()} rows`);
          }

          fullReport += '\n';
        }
      }
    } finally {
      await newsync5.end();
    }

    fullReport += '**Status:** ✅ Accessible\n\n';
  } catch (error) {
    fullReport += '**Status:** ❌ Not accessible\n';
    fullReport += `**Error:** ${(error as Error).message}\n\n`;
    console.error('Cannot access newsync5:', (error as Error).message);
  }

  // Save report
  fs.writeFileSync('/root/master-ops/buy-organics-online/COMPLETE-RDS-AUDIT.md', fullReport);
  console.log('\n\n✅ Complete audit saved: buy-organics-online/COMPLETE-RDS-AUDIT.md');
}

exploreAllDatabases().catch(console.error);
