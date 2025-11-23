#!/usr/bin/env node
/**
 * Upload Theme to BigCommerce via API
 * Uses existing .stencil credentials
 */

const https = require('https');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Read .stencil config
let config;
try {
  config = JSON.parse(fs.readFileSync('.stencil', 'utf8'));
} catch (err) {
  console.error('❌ Error: .stencil configuration not found');
  console.error('Run: npx @bigcommerce/stencil-cli init');
  process.exit(1);
}

const {
  normalStoreUrl,
  accessToken
} = config;

if (!normalStoreUrl || !accessToken) {
  console.error('❌ Error: Missing store URL or access token in .stencil');
  process.exit(1);
}

// Extract store hash from URL
const storeHash = normalStoreUrl.match(/store-([a-z0-9]+)/)?.[1] ||
                  normalStoreUrl.match(/mybigcommerce\.com/)?.[1];

console.log('\n🚀 Uploading Theme to BigCommerce\n');
console.log(`Store: ${normalStoreUrl}`);

// Find the zip file
const zipFiles = fs.readdirSync('.').filter(f => f.endsWith('.zip') && f.includes('Cornerstone-BOO'));
if (zipFiles.length === 0) {
  console.error('❌ Error: No theme bundle found');
  console.error('Run: node create-bundle.js');
  process.exit(1);
}

const bundleFile = zipFiles[0];
console.log(`Bundle: ${bundleFile}\n`);

// Upload using BigCommerce API
console.log('📤 Uploading theme...');
console.log('This may take a few minutes...\n');

const form = new FormData();
form.append('file', fs.createReadStream(bundleFile));

const options = {
  method: 'POST',
  hostname: 'api.bigcommerce.com',
  path: `/stores/${storeHash}/v3/themes`,
  headers: {
    'X-Auth-Token': accessToken,
    ...form.getHeaders()
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 201 || res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('✅ Theme uploaded successfully!\n');
      console.log('Theme Details:');
      console.log(`  UUID: ${response.data.uuid}`);
      console.log(`  Name: ${response.data.name}`);
      console.log(`  Version: ${response.data.version}\n`);
      console.log('🎯 Next Steps:');
      console.log('1. Go to BigCommerce Admin → Storefront → My Themes');
      console.log('2. Find your uploaded theme');
      console.log('3. Click "Customize" to preview');
      console.log('4. Click "Apply" when ready to activate\n');
    } else {
      console.error('❌ Upload failed!');
      console.error(`Status: ${res.statusCode}`);
      console.error('Response:', data);
      console.log('\n💡 Try manual upload instead:');
      console.log('1. Login to BigCommerce admin');
      console.log('2. Go to: Storefront → My Themes');
      console.log('3. Click "Upload Theme"');
      console.log(`4. Select: ${bundleFile}\n`);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Error uploading theme:', err.message);
  console.log('\n💡 Try manual upload instead:');
  console.log('1. Login to BigCommerce admin');
  console.log('2. Go to: Storefront → My Themes');
  console.log('3. Click "Upload Theme"');
  console.log(`4. Select: ${bundleFile}\n`);
});

form.pipe(req);
