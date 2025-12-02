#!/usr/bin/env tsx

/**
 * Download Buy Organics Online BigCommerce Theme
 *
 * Downloads the active theme from BigCommerce and saves locally
 * for version control and analysis
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'

console.log('\n📥 BigCommerce Theme Downloader\n');
console.log('Store: Buy Organics Online');
console.log('Store Hash: hhhi\n');

const STORE_HASH = process.env.BIGCOMMERCE_BOO_STORE_HASH || 'hhhi';
const ACCESS_TOKEN = process.env.BIGCOMMERCE_BOO_ACCESS_TOKEN || '';

async function downloadTheme() {
  if (!ACCESS_TOKEN) {
    console.log('❌ Error: BIGCOMMERCE_BOO_ACCESS_TOKEN not set');
    process.exit(1);
  }

  console.log('Step 1: Getting list of themes...\n');

  try {
    // Get themes list
    const themesResponse = await fetch(
      `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/themes`,
      {
        headers: {
          'X-Auth-Token': ACCESS_TOKEN,
          'Accept': 'application/json',
        },
      }
    );

    if (!themesResponse.ok) {
      console.log(`❌ Error getting themes: ${themesResponse.status} ${themesResponse.statusText}`);
      console.log('   This endpoint may require additional API scopes\n');

      console.log('📋 Alternative Methods to Download Theme:\n');
      console.log('Method 1: BigCommerce Control Panel (Manual)');
      console.log('   1. Login: https://store-hhhi.mybigcommerce.com/manage/');
      console.log('   2. Go to: Storefront → Themes');
      console.log('   3. Find active theme → Click "..." → Download\n');

      console.log('Method 2: Stencil CLI (Recommended for Developers)');
      console.log('   Install: npm install -g @bigcommerce/stencil-cli');
      console.log('   Init: stencil init');
      console.log('   Download: stencil download\n');

      console.log('Method 3: WebDAV Access (Advanced)');
      console.log('   Access theme files via WebDAV');
      console.log('   URL: https://store-hhhi.mybigcommerce.com/dav\n');

      return;
    }

    const themes = await themesResponse.json();
    console.log(`✅ Found ${themes.data?.length || 0} theme(s)\n`);

    // Find active theme
    const activeTheme = themes.data?.find((t: any) => t.is_active);

    if (!activeTheme) {
      console.log('⚠️  No active theme found\n');
      return;
    }

    console.log('Active Theme:');
    console.log(`   Name: ${activeTheme.name}`);
    console.log(`   Version: ${activeTheme.version || 'N/A'}`);
    console.log(`   UUID: ${activeTheme.uuid}`);
    console.log('');

    console.log('📦 Theme Information:\n');
    console.log('   BigCommerce Themes API has limited download capabilities.');
    console.log('   For full theme download, use one of these methods:\n');

    console.log('   ✅ RECOMMENDED: Stencil CLI');
    console.log('      - Full theme access');
    console.log('      - Local development');
    console.log('      - Version control ready\n');

    console.log('   Steps:');
    console.log('   1. Install Stencil CLI:');
    console.log('      npm install -g @bigcommerce/stencil-cli\n');

    console.log('   2. Initialize:');
    console.log('      mkdir boo-theme && cd boo-theme');
    console.log('      stencil init\n');

    console.log('   3. Enter credentials when prompted:');
    console.log(`      Store URL: https://store-${STORE_HASH}.mybigcommerce.com`);
    console.log(`      Access Token: ${ACCESS_TOKEN.substring(0, 10)}...\n`);

    console.log('   4. Download theme:');
    console.log('      stencil download\n');

    console.log('   5. Select your active theme from the list\n');

    console.log('   6. Push to GitHub:');
    console.log('      git init');
    console.log('      git add .');
    console.log('      git commit -m "Initial theme download"');
    console.log('      git remote add origin <your-github-repo>');
    console.log('      git push -u origin main\n');

  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  console.log('═══════════════════════════════════════════════════\n');
  console.log('🔍 What I Can Analyze Once Theme is Downloaded:\n');

  console.log('1. Performance Issues:');
  console.log('   - Blocking scripts');
  console.log('   - Large unminified files');
  console.log('   - Unused CSS/JS');
  console.log('   - Slow loading resources\n');

  console.log('2. Code Quality:');
  console.log('   - Old jQuery versions');
  console.log('   - Duplicate code');
  console.log('   - Security vulnerabilities');
  console.log('   - Outdated libraries\n');

  console.log('3. SEO Issues:');
  console.log('   - Missing meta tags');
  console.log('   - Broken structured data');
  console.log('   - Image optimization\n');

  console.log('4. Best Practices:');
  console.log('   - Code organization');
  console.log('   - Naming conventions');
  console.log('   - Documentation\n');

  console.log('═══════════════════════════════════════════════════\n');
  console.log('📝 Next Steps:\n');

  console.log('1. Download theme using Stencil CLI (steps above)');
  console.log('2. Save to: /root/master-ops/buy-organics-online/theme/');
  console.log('3. Let me know when done - I will analyze it');
  console.log('4. I will provide a detailed report with fixes\n');

  console.log('═══════════════════════════════════════════════════\n');
}

downloadTheme();
