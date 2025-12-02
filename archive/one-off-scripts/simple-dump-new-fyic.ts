import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function simpleDump() {
  const connection = await mysql.createConnection({
    host: process.env.AWS_RDS_NEWSYNC6_HOST,
    port: parseInt(process.env.AWS_RDS_NEWSYNC6_PORT || '3306'),
    user: process.env.AWS_RDS_NEWSYNC6_USER,
    password: process.env.AWS_RDS_NEWSYNC6_PASSWORD,
  });

  try {
    await connection.query('USE new_fyic_db');

    // Just dump everything raw
    console.log('='.repeat(100));
    console.log('CRONS TABLE');
    console.log('='.repeat(100));

    const [cronsSchema] = await connection.query('DESCRIBE crons');
    console.log('\nSchema:');
    console.log(JSON.stringify(cronsSchema, null, 2));

    const [crons] = await connection.query('SELECT * FROM crons LIMIT 50');
    console.log('\nRecent data (50 rows):');
    console.log(JSON.stringify(crons, null, 2));

    console.log('\n\n' + '='.repeat(100));
    console.log('BC_PRODUCTS TABLE');
    console.log('='.repeat(100));

    const [bcSchema] = await connection.query('DESCRIBE bc_products');
    console.log('\nSchema:');
    console.log(JSON.stringify(bcSchema, null, 2));

    const [bcProducts] = await connection.query('SELECT * FROM bc_products LIMIT 5');
    console.log('\nSample products:');
    console.log(JSON.stringify(bcProducts, null, 2));

    console.log('\n\n' + '='.repeat(100));
    console.log('BC_ORDERS TABLE');
    console.log('='.repeat(100));

    const [orderSchema] = await connection.query('DESCRIBE bc_orders');
    console.log('\nSchema:');
    console.log(JSON.stringify(orderSchema, null, 2));

    const [orders] = await connection.query('SELECT * FROM bc_orders ORDER BY id DESC LIMIT 5');
    console.log('\nRecent orders:');
    console.log(JSON.stringify(orders, null, 2));

    console.log('\n\n' + '='.repeat(100));
    console.log('SETTINGS TABLE');
    console.log('='.repeat(100));

    const [settings] = await connection.query('SELECT * FROM settings');
    console.log(JSON.stringify(settings, null, 2));

    console.log('\n\n' + '='.repeat(100));
    console.log('OBORNE_PRODUCTS TABLE');
    console.log('='.repeat(100));

    const [obSchema] = await connection.query('DESCRIBE oborne_products');
    console.log('\nSchema:');
    console.log(JSON.stringify(obSchema, null, 2));

    const [obProducts] = await connection.query('SELECT * FROM oborne_products LIMIT 3');
    console.log('\nSample:');
    console.log(JSON.stringify(obProducts, null, 2));

  } finally {
    await connection.end();
  }
}

simpleDump().catch(console.error);
