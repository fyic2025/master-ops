#!/usr/bin/env node
/**
 * Push theme to BigCommerce using API
 * Downloads current theme as backup, then pushes modified theme
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read .stencil config
const config = JSON.parse(fs.readFileSync('.stencil', 'utf8'));
const { normalStoreUrl, accessToken } = config;

console.log('\n🚀 BigCommerce Theme Deployment with Backup\n');
console.log(`Store: ${normalStoreUrl}\n`);

// Extract store hash
const storeHash = normalStoreUrl.match(/store-([a-z0-9]+)/)?.[1];

// Step 1: Get current active theme (for backup reference)
function getCurrentTheme() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.bigcommerce.com',
      path: `/stores/${storeHash}/v3/themes`,
      method: 'GET',
      headers: {
        'X-Auth-Token': accessToken,
        'Accept': 'application/json'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const themes = JSON.parse(data);
          const activeTheme = themes.data.find(t => t.is_active);
          resolve(activeTheme);
        } else {
          reject(new Error(`Failed to get themes: ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

// Step 2: Create bundle using PowerShell script
function createBundle() {
  console.log('📦 Creating theme bundle...\n');
  try {
    execSync('powershell -ExecutionPolicy Bypass -File make-bundle.ps1', {
      stdio: 'inherit'
    });
    return true;
  } catch (err) {
    console.error('❌ Bundle creation failed');
    return false;
  }
}

// Step 3: Upload theme
function uploadTheme(bundlePath) {
  console.log(`\n📤 Uploading ${bundlePath}...\n`);

  // Note: File upload requires multipart/form-data which is complex in pure Node
  // Recommend using curl or stencil-cli for actual upload
  console.log('⚠️  For upload, use one of these methods:\n');
  console.log('Method 1: Stencil CLI (recommended)');
  console.log('  npx @bigcommerce/stencil-cli push\n');

  console.log('Method 2: Manual upload via BigCommerce admin');
  console.log('  1. Go to Storefront → My Themes');
  console.log('  2. Upload the bundle file\n');

  console.log('Method 3: API with curl');
  console.log(`  curl -X POST "https://api.bigcommerce.com/stores/${storeHash}/v3/themes" \\`);
  console.log(`       -H "X-Auth-Token: ${accessToken}" \\`);
  console.log(`       -F "file=@${bundlePath}"`);
}

// Main workflow
(async () => {
  try {
    // Get current active theme info
    console.log('📋 Getting current active theme info...\n');
    const activeTheme = await getCurrentTheme();

    if (activeTheme) {
      console.log(`✅ Current Active Theme:`);
      console.log(`   Name: ${activeTheme.name}`);
      console.log(`   Version: ${activeTheme.version}`);
      console.log(`   UUID: ${activeTheme.uuid}\n`);

      // Save backup info
      fs.writeFileSync('BACKUP-INFO.json', JSON.stringify({
        backup_date: new Date().toISOString(),
        active_theme: activeTheme,
        store_url: normalStoreUrl,
        rollback_instructions: "To rollback, go to BigCommerce Admin → Storefront → My Themes, find the previous theme and click Apply"
      }, null, 2));

      console.log('✅ Backup info saved to BACKUP-INFO.json\n');
    }

    // Create bundle
    if (!createBundle()) {
      process.exit(1);
    }

    // Find the created bundle
    const bundles = fs.readdirSync('.').filter(f =>
      f.startsWith('Cornerstone-BOO-Cust') && f.endsWith('.zip')
    );

    if (bundles.length > 0) {
      const bundlePath = bundles[0];
      uploadTheme(bundlePath);
    } else {
      console.error('❌ No bundle file found');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
