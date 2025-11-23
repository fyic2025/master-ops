#!/usr/bin/env node
/**
 * Download current active theme from BigCommerce
 */

const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const STORE_HASH = 'hhhi';
const ACCESS_TOKEN = 'ttf2mji7i912znhbue9gauvu7fbiiyo';
const OUTPUT_DIR = 'theme-v6.17.0';

console.log('\n🔍 Getting current active theme from BigCommerce...\n');

// Step 1: Get current active theme
function getCurrentTheme() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.bigcommerce.com',
      path: `/stores/${STORE_HASH}/v3/themes`,
      method: 'GET',
      headers: {
        'X-Auth-Token': ACCESS_TOKEN,
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
          reject(new Error(`Failed to get themes: ${res.statusCode} ${data}`));
        }
      });
    }).on('error', reject);
  });
}

// Step 2: Download theme
function downloadTheme(themeUuid) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.bigcommerce.com',
      path: `/stores/${STORE_HASH}/v3/themes/${themeUuid}/download`,
      method: 'POST',
      headers: {
        'X-Auth-Token': ACCESS_TOKEN,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          resolve(response.data.download_url);
        } else {
          reject(new Error(`Failed to get download URL: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Main workflow
(async () => {
  try {
    // Get current active theme
    const activeTheme = await getCurrentTheme();

    if (!activeTheme) {
      console.error('❌ No active theme found');
      process.exit(1);
    }

    console.log(`✅ Active Theme: ${activeTheme.name} v${activeTheme.version}`);
    console.log(`   UUID: ${activeTheme.uuid}\n`);

    // Get download URL
    console.log('📥 Requesting download URL...');
    const downloadUrl = await downloadTheme(activeTheme.uuid);

    console.log(`✅ Download URL obtained\n`);

    // Download theme using curl
    const outputFile = `${OUTPUT_DIR}/theme-v${activeTheme.version}.zip`;
    console.log(`📦 Downloading theme to ${outputFile}...`);

    execSync(`curl -L "${downloadUrl}" -o "${outputFile}"`, { stdio: 'inherit' });

    console.log(`\n✅ Theme downloaded successfully!`);
    console.log(`📂 Extract it with: cd ${OUTPUT_DIR} && unzip theme-v${activeTheme.version}.zip\n`);

    // Save theme info
    fs.writeFileSync(`${OUTPUT_DIR}/theme-info.json`, JSON.stringify({
      download_date: new Date().toISOString(),
      theme: activeTheme,
      download_url: downloadUrl
    }, null, 2));

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
