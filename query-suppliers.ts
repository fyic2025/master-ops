import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function querySuppliers() {
  const connection = await mysql.createConnection({
    host: process.env.AWS_RDS_NEWSYNC6_HOST,
    port: parseInt(process.env.AWS_RDS_NEWSYNC6_PORT || '3306'),
    user: process.env.AWS_RDS_NEWSYNC6_USER,
    password: process.env.AWS_RDS_NEWSYNC6_PASSWORD,
  });

  try {
    await connection.query('USE c7c7buyorgdnxtl1');

    console.log('\n🏢 SUPPLIERS TABLE');
    console.log('='.repeat(100));
    const [suppliers] = await connection.query('SELECT * FROM suppliers');
    console.log(JSON.stringify(suppliers, null, 2));

    console.log('\n\n📡 FEEDS TABLE');
    console.log('='.repeat(100));
    const [feeds] = await connection.query('SELECT * FROM feeds');
    console.log(JSON.stringify(feeds, null, 2));

    console.log('\n\n🏪 CHANNELS TABLE');
    console.log('='.repeat(100));
    const [channels] = await connection.query('SELECT * FROM channels');
    console.log(JSON.stringify(channels, null, 2));

    console.log('\n\n🏭 WAREHOUSES TABLE');
    console.log('='.repeat(100));
    const [warehouses] = await connection.query('SELECT * FROM warehouses');
    console.log(JSON.stringify(warehouses, null, 2));

    console.log('\n\n💰 SAMPLE PRODUCT DATA from supplier_5f60cbb9e9dc5 (largest supplier)');
    console.log('='.repeat(100));
    const [sampleProducts] = await connection.query('SELECT * FROM supplier_5f60cbb9e9dc5 LIMIT 10');
    console.log(JSON.stringify(sampleProducts, null, 2));

    console.log('\n\n🔗 SAMPLE LIVE PRODUCT LINKS');
    console.log('='.repeat(100));
    const [liveLinks] = await connection.query('SELECT * FROM w_live_link_prod LIMIT 10');
    console.log(JSON.stringify(liveLinks, null, 2));

    console.log('\n\n📦 SAMPLE BIGCOMMERCE PRODUCT STATUS');
    console.log('='.repeat(100));
    const [wpProds] = await connection.query('SELECT * FROM wp_prods_check LIMIT 5');
    console.log(JSON.stringify(wpProds, null, 2));

  } finally {
    await connection.end();
  }
}

querySuppliers().catch(console.error);
