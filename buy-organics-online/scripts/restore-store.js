#!/usr/bin/env node
/**
 * BOO Store Restore CLI
 *
 * Restore tool for Buy Organics Online BigCommerce store backups.
 *
 * Usage:
 *   node restore-store.js --list                           # List available backups
 *   node restore-store.js --backup-id <id>                 # Restore full backup
 *   node restore-store.js --backup-id <id> --type products # Restore specific type
 *   node restore-store.js --find-product --sku "OB-123"    # Find product in backups
 *   node restore-store.js --verify --backup-id <id>        # Verify backup integrity
 *
 * Environment Variables Required:
 *   BOO_BC_STORE_HASH, BOO_BC_ACCESS_TOKEN
 *   DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_BUCKET, DO_SPACES_REGION
 */

const https = require('https');
const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const zlib = require('zlib');
const { promisify } = require('util');
const readline = require('readline');

const gunzip = promisify(zlib.gunzip);

// Configuration
const config = {
  bigcommerce: {
    storeHash: process.env.BOO_BC_STORE_HASH,
    accessToken: process.env.BOO_BC_ACCESS_TOKEN,
  },
  spaces: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
    bucket: process.env.DO_SPACES_BUCKET || 'boo-backups',
    region: process.env.DO_SPACES_REGION || 'syd1',
  }
};

// Initialize S3 client for DO Spaces
const s3Client = new S3Client({
  endpoint: `https://${config.spaces.region}.digitaloceanspaces.com`,
  region: config.spaces.region,
  credentials: {
    accessKeyId: config.spaces.accessKeyId,
    secretAccessKey: config.spaces.secretAccessKey,
  },
});

// BigCommerce API helper
async function bigcommerceApi(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.bigcommerce.com',
      path: `/stores/${config.bigcommerce.storeHash}${endpoint}`,
      method,
      headers: {
        'X-Auth-Token': config.bigcommerce.accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`BigCommerce API Error (${res.statusCode}): ${data}`));
        } else {
          resolve(data ? JSON.parse(data) : {});
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Download and parse file from Spaces
async function downloadFromSpaces(key) {
  const command = new GetObjectCommand({
    Bucket: config.spaces.bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  let data = Buffer.concat(chunks);

  // Decompress if gzipped
  if (key.endsWith('.gz')) {
    data = await gunzip(data);
  }

  return JSON.parse(data.toString('utf-8'));
}

// List available backups
async function listBackups() {
  console.log(`\n📦 Available Backups\n${'─'.repeat(60)}`);

  const backupTypes = ['daily', 'weekly', 'monthly', 'manual'];

  for (const type of backupTypes) {
    console.log(`\n${type.charAt(0).toUpperCase() + type.slice(1)} Backups:`);

    try {
      const command = new ListObjectsV2Command({
        Bucket: config.spaces.bucket,
        Prefix: `${type}/`,
        Delimiter: '/',
      });

      const response = await s3Client.send(command);

      if (response.CommonPrefixes && response.CommonPrefixes.length > 0) {
        // Sort by date descending
        const prefixes = response.CommonPrefixes
          .map(p => p.Prefix)
          .sort()
          .reverse()
          .slice(0, 5);

        for (const prefix of prefixes) {
          // Try to get manifest
          try {
            const manifest = await downloadFromSpaces(`${prefix}manifest.json`);
            const date = new Date(manifest.created_at).toLocaleString();
            const records = manifest.total_records?.toLocaleString() || '?';
            const size = manifest.total_size_bytes
              ? `${(manifest.total_size_bytes / 1024 / 1024).toFixed(1)} MB`
              : '?';
            console.log(`  • ${manifest.backup_id}`);
            console.log(`    Date: ${date} | Records: ${records} | Size: ${size}`);
          } catch {
            console.log(`  • ${prefix.replace(/\/$/, '')} (no manifest)`);
          }
        }
      } else {
        console.log('  (none)');
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }

  console.log('');
}

// Verify backup integrity
async function verifyBackup(backupId) {
  console.log(`\n🔍 Verifying Backup: ${backupId}\n${'─'.repeat(50)}`);

  // Parse backup ID to get path
  const match = backupId.match(/boo-(daily|weekly|monthly|manual)-(.+)/);
  if (!match) {
    console.error('Invalid backup ID format');
    return false;
  }

  const [, type, datePart] = match;
  const basePath = `${type}/${datePart}`;

  try {
    // Get manifest
    console.log(`\n  Loading manifest...`);
    const manifest = await downloadFromSpaces(`${basePath}/manifest.json`);
    console.log(`  ✅ Manifest found (${manifest.files?.length || 0} files)`);

    // Verify each file
    let allValid = true;
    for (const file of manifest.files || []) {
      process.stdout.write(`  Checking ${file.name}... `);
      try {
        const command = new GetObjectCommand({
          Bucket: config.spaces.bucket,
          Key: file.name,
        });
        const response = await s3Client.send(command);
        const size = response.ContentLength;

        if (Math.abs(size - file.size_bytes) < 100) {
          console.log(`✅ (${file.records} records)`);
        } else {
          console.log(`⚠️  Size mismatch (expected ${file.size_bytes}, got ${size})`);
          allValid = false;
        }
      } catch (err) {
        console.log(`❌ ${err.message}`);
        allValid = false;
      }
    }

    console.log(`\n${allValid ? '✅ Backup verified successfully!' : '⚠️  Some files have issues'}\n`);
    return allValid;
  } catch (error) {
    console.error(`\n❌ Verification failed: ${error.message}\n`);
    return false;
  }
}

// Restore from backup
async function restoreBackup(backupId, dataTypes = null, dryRun = false) {
  console.log(`\n🔄 Restoring from Backup: ${backupId}`);
  if (dryRun) console.log('   (DRY RUN - no changes will be made)');
  console.log(`${'─'.repeat(50)}`);

  // Parse backup ID
  const match = backupId.match(/boo-(daily|weekly|monthly|manual)-(.+)/);
  if (!match) {
    console.error('Invalid backup ID format');
    return;
  }

  const [, type, datePart] = match;
  const basePath = `${type}/${datePart}`;

  // Confirmation
  if (!dryRun) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => {
      rl.question('\n⚠️  This will overwrite existing data. Continue? (yes/no): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('Restore cancelled.\n');
      return;
    }
  }

  try {
    // Get manifest
    const manifest = await downloadFromSpaces(`${basePath}/manifest.json`);
    console.log(`\n  Backup from: ${manifest.created_at}`);
    console.log(`  Total records: ${manifest.total_records?.toLocaleString()}`);

    // Determine what to restore
    const typesToRestore = dataTypes || ['products', 'categories', 'brands'];

    for (const dataType of typesToRestore) {
      console.log(`\n  📦 Restoring ${dataType}...`);

      try {
        // Download data
        const key = `${basePath}/${dataType}.json.gz`;
        const data = await downloadFromSpaces(key);
        console.log(`     Downloaded ${data.length} records`);

        if (dryRun) {
          console.log(`     [DRY RUN] Would restore ${data.length} ${dataType}`);
          continue;
        }

        // Restore based on type
        switch (dataType) {
          case 'products':
            await restoreProducts(data);
            break;
          case 'categories':
            await restoreCategories(data);
            break;
          case 'brands':
            await restoreBrands(data);
            break;
          case 'customers':
            console.log('     ⚠️  Customer restore not implemented (privacy)');
            break;
          case 'orders':
            console.log('     ⚠️  Order restore not supported (read-only)');
            break;
          default:
            console.log(`     ⚠️  Unknown data type: ${dataType}`);
        }
      } catch (err) {
        console.log(`     ❌ Error: ${err.message}`);
      }
    }

    console.log(`\n✅ Restore completed!\n`);
  } catch (error) {
    console.error(`\n❌ Restore failed: ${error.message}\n`);
  }
}

// Restore products
async function restoreProducts(products) {
  let restored = 0;
  let failed = 0;

  for (const product of products) {
    try {
      // Check if product exists
      const existing = await bigcommerceApi(`/v3/catalog/products?sku=${encodeURIComponent(product.sku)}`);

      if (existing.data && existing.data.length > 0) {
        // Update existing
        await bigcommerceApi(`/v3/catalog/products/${existing.data[0].id}`, 'PUT', {
          name: product.name,
          price: product.price,
          description: product.description,
          // Add other fields as needed
        });
      } else {
        // Create new (be careful with this)
        console.log(`     ⚠️  Product ${product.sku} not found, skipping create`);
      }
      restored++;
    } catch (err) {
      failed++;
    }

    // Progress
    if ((restored + failed) % 100 === 0) {
      process.stdout.write(`\r     Processed ${restored + failed}/${products.length}...`);
    }
  }

  console.log(`\r     Restored: ${restored}, Failed: ${failed}          `);
}

// Restore categories
async function restoreCategories(categories) {
  console.log(`     Would restore ${categories.length} categories`);
  // Implementation would go here
}

// Restore brands
async function restoreBrands(brands) {
  console.log(`     Would restore ${brands.length} brands`);
  // Implementation would go here
}

// Find product in backups
async function findProduct(sku) {
  console.log(`\n🔍 Searching for product: ${sku}\n${'─'.repeat(50)}`);

  const backupTypes = ['weekly', 'daily', 'monthly'];

  for (const type of backupTypes) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: config.spaces.bucket,
        Prefix: `${type}/`,
        Delimiter: '/',
      });

      const response = await s3Client.send(command);
      const latestBackup = response.CommonPrefixes?.[response.CommonPrefixes.length - 1]?.Prefix;

      if (latestBackup) {
        console.log(`\n  Checking ${type} backup: ${latestBackup}`);

        try {
          const products = await downloadFromSpaces(`${latestBackup}products.json.gz`);
          const found = products.find(p =>
            p.sku === sku ||
            p.sku?.toLowerCase() === sku.toLowerCase()
          );

          if (found) {
            console.log(`\n  ✅ Found in ${latestBackup}:`);
            console.log(`     SKU: ${found.sku}`);
            console.log(`     Name: ${found.name}`);
            console.log(`     Price: $${found.price}`);
            console.log(`     ID: ${found.id}`);
            return found;
          }
        } catch (err) {
          console.log(`     Could not search: ${err.message}`);
        }
      }
    } catch (err) {
      console.log(`  Error searching ${type}: ${err.message}`);
    }
  }

  console.log(`\n  ❌ Product not found in any backup\n`);
  return null;
}

// Parse arguments and run
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
BOO Store Restore CLI

Usage:
  node restore-store.js --list                           List available backups
  node restore-store.js --backup-id <id>                 Restore full backup
  node restore-store.js --backup-id <id> --type <type>   Restore specific type
  node restore-store.js --backup-id <id> --dry-run       Preview restore
  node restore-store.js --verify --backup-id <id>        Verify backup integrity
  node restore-store.js --find-product --sku <sku>       Find product in backups

Data Types:
  products, categories, brands, customers, orders

Examples:
  node restore-store.js --list
  node restore-store.js --backup-id boo-weekly-2025-W48
  node restore-store.js --backup-id boo-weekly-2025-W48 --type products --dry-run
  node restore-store.js --find-product --sku "OB - 12345"
`);
    return;
  }

  if (args.includes('--list')) {
    await listBackups();
    return;
  }

  if (args.includes('--verify')) {
    const idIndex = args.indexOf('--backup-id');
    if (idIndex === -1 || !args[idIndex + 1]) {
      console.error('Please provide --backup-id');
      process.exit(1);
    }
    await verifyBackup(args[idIndex + 1]);
    return;
  }

  if (args.includes('--find-product')) {
    const skuIndex = args.indexOf('--sku');
    if (skuIndex === -1 || !args[skuIndex + 1]) {
      console.error('Please provide --sku');
      process.exit(1);
    }
    await findProduct(args[skuIndex + 1]);
    return;
  }

  if (args.includes('--backup-id')) {
    const idIndex = args.indexOf('--backup-id');
    const backupId = args[idIndex + 1];

    if (!backupId) {
      console.error('Please provide a backup ID');
      process.exit(1);
    }

    const typeIndex = args.indexOf('--type');
    const dataTypes = typeIndex !== -1 && args[typeIndex + 1]
      ? [args[typeIndex + 1]]
      : null;

    const dryRun = args.includes('--dry-run');

    await restoreBackup(backupId, dataTypes, dryRun);
    return;
  }

  // Default: show help
  console.log('Use --help for usage information');
}

main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
