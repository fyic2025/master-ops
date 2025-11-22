#!/usr/bin/env tsx

/**
 * Analyze Buy Organics Online Website for Code Errors
 *
 * This script checks for:
 * - JavaScript errors
 * - Console errors
 * - Network issues
 * - Performance problems
 * - Frontend configuration issues
 */

import 'dotenv/config'

console.log('\n🔍 Buy Organics Online - Website Code Error Analysis');
console.log('======================================================\n');

console.log('Website: https://www.buyorganicsonline.com.au\n');

console.log('📋 What to Check for Code Errors:\n');

console.log('1. Browser Console Errors:');
console.log('   - Open website in browser');
console.log('   - Press F12 (Developer Tools)');
console.log('   - Go to Console tab');
console.log('   - Look for red error messages\n');

console.log('   Common errors to check:');
console.log('   ❌ Uncaught TypeError');
console.log('   ❌ Failed to load resource');
console.log('   ❌ 404 Not Found');
console.log('   ❌ CORS errors');
console.log('   ❌ Script execution errors\n');

console.log('2. Network Tab Issues:');
console.log('   - Developer Tools → Network tab');
console.log('   - Reload page (Ctrl+R)');
console.log('   - Look for failed requests (red)\n');

console.log('   Check for:');
console.log('   ❌ 404 errors (missing files)');
console.log('   ❌ 500 errors (server issues)');
console.log('   ❌ Slow loading resources');
console.log('   ❌ Failed API calls\n');

console.log('3. Checkout-Specific Errors:');
console.log('   - Add product to cart');
console.log('   - Go to checkout');
console.log('   - Check console for errors during:');
console.log('     • Address entry');
console.log('     • Shipping calculation');
console.log('     • Payment processing\n');

console.log('4. ShipperHQ Integration Errors:');
console.log('   - Console tab during checkout');
console.log('   - Look for ShipperHQ API errors');
console.log('   - Check Network tab for:');
console.log('     • shipperhq.com API calls');
console.log('     • Rate calculation failures\n');

console.log('5. BigCommerce Stencil Theme Errors:');
console.log('   - Theme JavaScript errors');
console.log('   - jQuery errors');
console.log('   - Custom script conflicts\n');

console.log('═══════════════════════════════════════════════════\n');
console.log('🛠️  Automated Checks We Can Perform:\n');

// Check if we can access the website
console.log('Checking website accessibility...');

async function checkWebsite() {
  try {
    const response = await fetch('https://www.buyorganicsonline.com.au', {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BOO-Health-Check/1.0)'
      }
    });

    console.log(`✅ Website is accessible (Status: ${response.status})`);
    console.log(`   Server: ${response.headers.get('server') || 'Unknown'}`);
    console.log(`   Content-Type: ${response.headers.get('content-type') || 'Unknown'}`);

    return true;
  } catch (error) {
    console.log(`❌ Cannot reach website: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function checkCommonEndpoints() {
  console.log('\nChecking common endpoints for errors...\n');

  const endpoints = [
    '/',
    '/cart.php',
    '/checkout',
    '/login.php',
    '/search.php',
    '/sitemap.xml',
    '/robots.txt',
  ];

  for (const endpoint of endpoints) {
    try {
      const url = `https://www.buyorganicsonline.com.au${endpoint}`;
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BOO-Health-Check/1.0)'
        }
      });

      const status = response.status;
      const emoji = status === 200 ? '✅' : status === 404 ? '❌' : '⚠️';
      console.log(`${emoji} ${endpoint.padEnd(20)} → ${status} ${response.statusText}`);
    } catch (error) {
      console.log(`❌ ${endpoint.padEnd(20)} → Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function checkBigCommerceAPI() {
  console.log('\n\nChecking BigCommerce API health...\n');

  try {
    const { bigcommerceClient } = await import('./shared/libs/integrations/bigcommerce');

    const health = await bigcommerceClient.healthCheck();

    if (health.status === 'healthy') {
      console.log('✅ BigCommerce API: Healthy');
      console.log(`   Store: ${health.store?.name}`);
      console.log(`   Products: ${health.productCount}`);
    } else {
      console.log('❌ BigCommerce API: Unhealthy');
      console.log(`   Error: ${health.error}`);
    }
  } catch (error) {
    console.log('❌ BigCommerce API check failed');
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function analyzeSiteIssues() {
  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('📊 Analysis Summary\n');

  const websiteUp = await checkWebsite();

  if (websiteUp) {
    await checkCommonEndpoints();
  }

  await checkBigCommerceAPI();

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('🎯 Next Steps for Finding Code Errors:\n');

  console.log('MANUAL CHECKS REQUIRED:\n');

  console.log('1. Browser Developer Tools (Most Important!)');
  console.log('   → Open: https://www.buyorganicsonline.com.au');
  console.log('   → Press F12');
  console.log('   → Check Console tab for errors');
  console.log('   → Screenshot any errors and share\n');

  console.log('2. Test Checkout Flow');
  console.log('   → Add product to cart');
  console.log('   → Proceed to checkout');
  console.log('   → Watch console for errors during shipping calculation');
  console.log('   → Note exact error messages\n');

  console.log('3. Check Network Tab');
  console.log('   → Look for failed API calls (red)');
  console.log('   → Check ShipperHQ rate requests');
  console.log('   → Note any 404, 500, or CORS errors\n');

  console.log('4. Test Different Scenarios');
  console.log('   → Different browsers (Chrome, Firefox, Safari)');
  console.log('   → Mobile vs Desktop');
  console.log('   → Different products in cart');
  console.log('   → Different shipping addresses\n');

  console.log('═══════════════════════════════════════════════════');
  console.log('📝 Information Needed to Diagnose:\n');

  console.log('Please provide:');
  console.log('1. Screenshots of Console errors (F12 → Console)');
  console.log('2. Screenshots of Network errors (F12 → Network)');
  console.log('3. Specific page where error occurs');
  console.log('4. Steps to reproduce the issue');
  console.log('5. Browser and device being used\n');

  console.log('═══════════════════════════════════════════════════\n');
}

analyzeSiteIssues();
