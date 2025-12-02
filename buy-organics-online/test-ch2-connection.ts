/**
 * Test CH2 FTP Connection
 *
 * Verifies we can connect to CH2 FTP and lists available files
 */

import * as ftp from 'basic-ftp';

const CH2_FTP_CONFIG = {
  host: 'ftp3.ch2.net.au',
  user: 'retail_310',
  password: 'am2SH6wWevAY&#+Q',
  secure: false
};

async function testCH2Connection() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              CH2 FTP CONNECTION TEST                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    console.log(`Connecting to ${CH2_FTP_CONFIG.host}...`);

    await client.access({
      host: CH2_FTP_CONFIG.host,
      user: CH2_FTP_CONFIG.user,
      password: CH2_FTP_CONFIG.password,
      secure: false
    });

    console.log('\n✅ CONNECTION SUCCESSFUL!\n');

    // List root directory
    console.log('📁 Root directory contents:');
    const rootList = await client.list('/');
    rootList.forEach(item => {
      const type = item.isDirectory ? '📂' : '📄';
      console.log(`  ${type} ${item.name} (${item.size} bytes)`);
    });

    // Check for inventory directory
    console.log('\n📁 Checking /prod_retail_310/ (inventory):');
    try {
      const invList = await client.list('/prod_retail_310/');
      invList.forEach(item => {
        const type = item.isDirectory ? '📂' : '📄';
        const date = item.modifiedAt ? item.modifiedAt.toISOString() : 'unknown';
        console.log(`  ${type} ${item.name} (${item.size} bytes) - Modified: ${date}`);
      });
    } catch (e: any) {
      console.log(`  ❌ Could not access: ${e.message}`);
    }

    // Check for products directory
    console.log('\n📁 Checking /prod_retail_product/ (products):');
    try {
      const prodList = await client.list('/prod_retail_product/');
      prodList.forEach(item => {
        const type = item.isDirectory ? '📂' : '📄';
        const date = item.modifiedAt ? item.modifiedAt.toISOString() : 'unknown';
        console.log(`  ${type} ${item.name} (${item.size} bytes) - Modified: ${date}`);
      });
    } catch (e: any) {
      console.log(`  ❌ Could not access: ${e.message}`);
    }

    // Try to download a sample of inventory.csv
    console.log('\n📥 Testing inventory.csv download (first 5 lines):');
    try {
      const chunks: Buffer[] = [];
      await client.downloadTo(
        {
          write: (chunk: Buffer) => {
            chunks.push(chunk);
            return true;
          },
          end: () => {}
        } as any,
        '/prod_retail_310/inventory.csv'
      );

      const content = Buffer.concat(chunks).toString('utf-8');
      const lines = content.split('\n').slice(0, 5);
      lines.forEach((line, i) => {
        console.log(`  Line ${i + 1}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
      });
      console.log(`  ... Total size: ${content.length} bytes`);
    } catch (e: any) {
      console.log(`  ❌ Could not download: ${e.message}`);
    }

    // Try to download a sample of products.csv
    console.log('\n📥 Testing products.csv download (first 5 lines):');
    try {
      const chunks: Buffer[] = [];
      await client.downloadTo(
        {
          write: (chunk: Buffer) => {
            chunks.push(chunk);
            return true;
          },
          end: () => {}
        } as any,
        '/prod_retail_product/products.csv'
      );

      const content = Buffer.concat(chunks).toString('utf-8');
      const lines = content.split('\n').slice(0, 5);
      lines.forEach((line, i) => {
        console.log(`  Line ${i + 1}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
      });
      console.log(`  ... Total size: ${content.length} bytes`);
    } catch (e: any) {
      console.log(`  ❌ Could not download: ${e.message}`);
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              CONNECTION TEST COMPLETE                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('✅ CH2 FTP connection verified and working!');
    console.log('   Ready to build the CH2 supplier sync.\n');

  } catch (error: any) {
    console.error('\n❌ CONNECTION FAILED:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

testCH2Connection();
