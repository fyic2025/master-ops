import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function summarizeDatabase() {
  console.log('🔍 Connecting to newsync6 database...\n');

  const connection = await mysql.createConnection({
    host: process.env.AWS_RDS_NEWSYNC6_HOST,
    port: parseInt(process.env.AWS_RDS_NEWSYNC6_PORT || '3306'),
    user: process.env.AWS_RDS_NEWSYNC6_USER,
    password: process.env.AWS_RDS_NEWSYNC6_PASSWORD,
  });

  let report = '';

  try {
    console.log('✅ Connected successfully!\n');
    report += '# Buy Organics Online - Database Discovery Report\n\n';
    report += '**Date:** ' + new Date().toISOString().split('T')[0] + '\n';
    report += '**Database Instance:** newsync6.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com\n\n';
    report += '---\n\n';

    // Use the BOO database
    await connection.query('USE c7c7buyorgdnxtl1');
    report += '## Database: c7c7buyorgdnxtl1\n\n';

    // Get all tables with row counts
    const [tables] = await connection.query('SHOW TABLES');
    const tableList: Array<{name: string, rows: number, columns: number}> = [];

    console.log('📋 Analyzing tables...\n');

    for (const tableRow of tables as any[]) {
      const tableName = Object.values(tableRow)[0] as string;

      // Get row count
      const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      const rowCount = Array.isArray(countResult) && countResult[0] ? (countResult[0] as any).count : 0;

      // Get column count
      const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
      const columnCount = Array.isArray(columns) ? columns.length : 0;

      tableList.push({ name: tableName, rows: rowCount, columns: columnCount });
      console.log(`   ✓ ${tableName}: ${rowCount} rows, ${columnCount} columns`);
    }

    // Sort by row count (descending)
    tableList.sort((a, b) => b.rows - a.rows);

    report += '### Table Summary (sorted by row count)\n\n';
    report += '| Table Name | Rows | Columns |\n';
    report += '|------------|------|--------|\n';
    tableList.forEach(t => {
      report += `| ${t.name} | ${t.rows.toLocaleString()} | ${t.columns} |\n`;
    });

    report += '\n\n';
    report += '---\n\n';

    // Detailed structure for key tables
    const keyTables = tableList.filter(t => t.rows > 100 || ['products', 'suppliers', 'orders', 'sync_logs', 'bcs'].includes(t.name));

    report += '## Key Tables - Detailed Structure\n\n';

    for (const table of keyTables.slice(0, 15)) {
      report += `### ${table.name}\n\n`;
      report += `**Rows:** ${table.rows.toLocaleString()}  \n`;
      report += `**Columns:** ${table.columns}\n\n`;

      const [columns] = await connection.query(`DESCRIBE \`${table.name}\``);
      report += '**Schema:**\n\n';
      report += '| Field | Type | Null | Key | Default | Extra |\n';
      report += '|-------|------|------|-----|---------|-------|\n';
      (columns as any[]).forEach(col => {
        report += `| ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key || ''} | ${col.Default || ''} | ${col.Extra || ''} |\n`;
      });

      // Sample data for small tables
      if (table.rows > 0 && table.rows <= 10) {
        const [sample] = await connection.query(`SELECT * FROM \`${table.name}\` LIMIT 5`);
        report += '\n**Sample Data:**\n\n';
        report += '```json\n';
        report += JSON.stringify(sample, null, 2);
        report += '\n```\n';
      }

      report += '\n';
    }

    // Check for supplier/vendor tables
    report += '---\n\n';
    report += '## Supplier/Vendor Analysis\n\n';

    const supplierTables = tableList.filter(t =>
      t.name.toLowerCase().includes('supplier') ||
      t.name.toLowerCase().includes('vendor') ||
      t.name.toLowerCase().includes('source')
    );

    if (supplierTables.length > 0) {
      report += 'Found supplier-related tables:\n\n';
      supplierTables.forEach(t => {
        report += `- **${t.name}**: ${t.rows} rows\n`;
      });
    } else {
      report += 'No obvious supplier tables found. Supplier data may be embedded in product tables.\n';
    }

    // Save report
    fs.writeFileSync('/root/master-ops/buy-organics-online/DATABASE-SUMMARY.md', report);
    console.log('\n✅ Summary saved to buy-organics-online/DATABASE-SUMMARY.md');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

summarizeDatabase().catch(console.error);
