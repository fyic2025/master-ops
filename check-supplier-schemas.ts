import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSchemas() {
  const connection = await mysql.createConnection({
    host: process.env.AWS_RDS_NEWSYNC6_HOST,
    port: parseInt(process.env.AWS_RDS_NEWSYNC6_PORT || '3306'),
    user: process.env.AWS_RDS_NEWSYNC6_USER,
    password: process.env.AWS_RDS_NEWSYNC6_PASSWORD,
  });

  try {
    await connection.query('USE new_fyic_db');

    console.log('='.repeat(80));
    console.log('OBORNE_PRODUCTS SCHEMA');
    console.log('='.repeat(80));
    const [oborneSchema] = await connection.query('DESCRIBE oborne_products');
    console.log(JSON.stringify(oborneSchema, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('UHP_PRODUCTS SCHEMA');
    console.log('='.repeat(80));
    const [uhpSchema] = await connection.query('DESCRIBE uhp_products');
    console.log(JSON.stringify(uhpSchema, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('KADAC_PRODUCTS SCHEMA');
    console.log('='.repeat(80));
    const [kadacSchema] = await connection.query('DESCRIBE kadac_products');
    console.log(JSON.stringify(kadacSchema, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('BC_PRODUCTS SAMPLE');
    console.log('='.repeat(80));
    const [bcSample] = await connection.query('SELECT * FROM bc_products LIMIT 2');
    console.log(JSON.stringify(bcSample, null, 2));

  } finally {
    await connection.end();
  }
}

checkSchemas().catch(console.error);
