import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function exploreDatabase() {
  console.log('🔍 Connecting to newsync6 database...\n');

  const connection = await mysql.createConnection({
    host: process.env.AWS_RDS_NEWSYNC6_HOST,
    port: parseInt(process.env.AWS_RDS_NEWSYNC6_PORT || '3306'),
    user: process.env.AWS_RDS_NEWSYNC6_USER,
    password: process.env.AWS_RDS_NEWSYNC6_PASSWORD,
    // Don't specify database - we'll discover it
  });

  try {
    console.log('✅ Connected successfully!\n');

    // List all databases
    console.log('📊 DATABASES:');
    console.log('='.repeat(80));
    const [databases] = await connection.query('SHOW DATABASES');
    console.log(databases);
    console.log('\n');

    // Find the actual database with tables (skip system databases)
    const systemDbs = ['information_schema', 'mysql', 'performance_schema', 'sys'];
    const userDatabases = (databases as any[]).filter(
      (db: any) => !systemDbs.includes(Object.values(db)[0])
    );

    console.log(`📊 User databases found: ${userDatabases.length}\n`);

    // Explore each user database
    for (const dbRow of userDatabases) {
      const dbName = Object.values(dbRow)[0] as string;
      console.log(`\n🗄️  Exploring database: ${dbName}`);
      console.log('='.repeat(80));

      await connection.query(`USE \`${dbName}\``);

      // List all tables
      const [tables] = await connection.query('SHOW TABLES');
      const tableCount = Array.isArray(tables) ? tables.length : 0;
      console.log(`📋 Tables in ${dbName}: ${tableCount}\n`);

      // Get detailed info for each table
      if (Array.isArray(tables) && tables.length > 0) {
        console.log('📐 TABLE DETAILS:');
        console.log('='.repeat(80));

        for (const tableRow of tables) {
          const tableName = Object.values(tableRow)[0] as string;

          // Get row count
          const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
          const rowCount = Array.isArray(countResult) && countResult[0] ? (countResult[0] as any).count : 0;

          // Get column info
          const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
          const columnCount = Array.isArray(columns) ? columns.length : 0;

          console.log(`\n📁 Table: ${tableName}`);
          console.log(`   Rows: ${rowCount}`);
          console.log(`   Columns: ${columnCount}`);

          // Show column structure
          if (Array.isArray(columns)) {
            console.log('   Structure:');
            columns.forEach((col: any) => {
              const key = col.Key ? ` [${col.Key}]` : '';
              const nullable = col.Null === 'NO' ? ' NOT NULL' : '';
              console.log(`     - ${col.Field}: ${col.Type}${key}${nullable}`);
            });
          }

          // Show sample data for small tables or first 5 rows
          if (rowCount > 0 && rowCount <= 20) {
            const [sampleData] = await connection.query(`SELECT * FROM \`${tableName}\` LIMIT 5`);
            console.log('   Sample data (first 5 rows):');
            console.log('   ', JSON.stringify(sampleData, null, 2));
          }
        }
      }
    }

    console.log('\n');
    console.log('✅ Database exploration complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

exploreDatabase().catch(console.error);
