import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function exploreOtherDatabases() {
  const connection = await mysql.createConnection({
    host: process.env.AWS_RDS_NEWSYNC6_HOST,
    port: parseInt(process.env.AWS_RDS_NEWSYNC6_PORT || '3306'),
    user: process.env.AWS_RDS_NEWSYNC6_USER,
    password: process.env.AWS_RDS_NEWSYNC6_PASSWORD,
  });

  try {
    console.log('🔍 Exploring other databases on newsync6...\n');

    // Explore dracah
    console.log('\n📊 DATABASE: dracah');
    console.log('='.repeat(100));

    await connection.query('USE dracah');
    const [dracahTables] = await connection.query('SHOW TABLES');
    console.log(`Tables: ${(dracahTables as any[]).length}`);

    if ((dracahTables as any[]).length > 0) {
      console.log('\nTable list:');
      for (const tableRow of dracahTables as any[]) {
        const tableName = Object.values(tableRow)[0] as string;
        const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        const rowCount = (countResult as any)[0].count;
        console.log(`  - ${tableName}: ${rowCount} rows`);
      }
    }

    // Explore new_fyic_db
    console.log('\n\n📊 DATABASE: new_fyic_db');
    console.log('='.repeat(100));

    await connection.query('USE new_fyic_db');
    const [fyicTables] = await connection.query('SHOW TABLES');
    console.log(`Tables: ${(fyicTables as any[]).length}`);

    if ((fyicTables as any[]).length > 0) {
      console.log('\nTable list:');
      for (const tableRow of fyicTables as any[]) {
        const tableName = Object.values(tableRow)[0] as string;
        const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        const rowCount = (countResult as any)[0].count;
        console.log(`  - ${tableName}: ${rowCount} rows`);
      }
    }

    console.log('\n\n✅ Exploration complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

exploreOtherDatabases().catch(console.error);
