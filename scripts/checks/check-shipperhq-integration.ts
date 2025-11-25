#!/usr/bin/env tsx

/**
 * Check ShipperHQ Integration for Buy Organics Online
 *
 * ShipperHQ is a third-party shipping app that manages shipping rates
 * This script checks if ShipperHQ is properly integrated
 */

import 'dotenv/config'
import { bigcommerceClient } from './shared/libs/integrations/bigcommerce'

async function checkShipperHQ() {
  console.log('\n📦 Buy Organics Online - ShipperHQ Integration Check');
  console.log('====================================================\n');
  console.log('Note: Shipping managed by ShipperHQ (not native BigCommerce)\n');

  try {
    // Get store info
    const store = await bigcommerceClient.store.get();
    console.log('Store Information:');
    console.log(`  Name: ${store.name}`);
    console.log(`  Domain: ${store.domain}`);
    console.log('');

    // Get shipping zones (might be ShipperHQ managed)
    console.log('Checking Shipping Configuration...');
    const zones = await bigcommerceClient.shipping.listZones();
    console.log(`Found ${zones.length} shipping zone(s)\n`);

    let shipperHQDetected = false;

    for (const zone of zones) {
      console.log(`📦 Zone ${zone.id}: ${zone.name}`);
      console.log(`   Type: ${zone.type}`);
      console.log(`   Enabled: ${zone.enabled}`);

      // Get shipping methods for this zone
      const methods = await bigcommerceClient.shipping.listMethods(zone.id);
      console.log(`   Methods: ${methods.length} configured\n`);

      methods.forEach((method: any) => {
        console.log(`     - ${method.name}`);
        console.log(`       Type: ${method.type}`);
        console.log(`       Enabled: ${method.enabled}`);

        // Check if ShipperHQ is mentioned
        if (
          method.name?.toLowerCase().includes('shipperhq') ||
          method.type?.toLowerCase().includes('shipperhq') ||
          method.type === 'shipperhq'
        ) {
          shipperHQDetected = true;
          console.log(`       ✅ ShipperHQ method detected!`);
        }
        console.log('');
      });
    }

    // Check for ShipperHQ in channels/settings
    console.log('\n📊 Analysis');
    console.log('===========\n');

    if (shipperHQDetected) {
      console.log('✅ ShipperHQ integration detected in shipping methods');
    } else {
      console.log('⚠️  ShipperHQ not detected in standard shipping methods');
      console.log('   This is normal - ShipperHQ often works via different configuration');
    }

    console.log('\n💡 ShipperHQ Configuration:');
    console.log('   ShipperHQ manages shipping rates externally from BigCommerce.');
    console.log('   To check ShipperHQ configuration:');
    console.log('   1. Login to BigCommerce: https://store-hhhi.mybigcommerce.com/manage/');
    console.log('   2. Go to: Apps → My Apps');
    console.log('   3. Find: ShipperHQ');
    console.log('   4. Click "Launch" to access ShipperHQ dashboard');
    console.log('');

    console.log('\n🔍 Potential Issues with ShipperHQ:');
    console.log('   1. ShipperHQ API key expired or invalid');
    console.log('   2. ShipperHQ rules not configured for Australia');
    console.log('   3. ShipperHQ origin address not set correctly');
    console.log('   4. Product attributes missing (weight, dimensions)');
    console.log('   5. ShipperHQ not enabled for checkout');
    console.log('');

    console.log('\n🛠️  How to Diagnose ShipperHQ Issues:');
    console.log('   A. Check ShipperHQ Connection Status:');
    console.log('      - BigCommerce → Apps → ShipperHQ → Launch');
    console.log('      - Verify "Connected" status');
    console.log('');
    console.log('   B. Check ShipperHQ Shipping Rules:');
    console.log('      - ShipperHQ Dashboard → Shipping Rules');
    console.log('      - Ensure Australia is covered');
    console.log('      - Check origin address is Australian');
    console.log('');
    console.log('   C. Test Shipping Calculation:');
    console.log('      - ShipperHQ Dashboard → Testing');
    console.log('      - Enter test Australian address');
    console.log('      - Verify rates are returned');
    console.log('');
    console.log('   D. Check Product Configuration:');
    console.log('      - Products must have weight/dimensions');
    console.log('      - Checking sample products...\n');

    // Check product configuration
    const products = await bigcommerceClient.products.list({
      is_visible: true,
      limit: 10
    });

    console.log(`   Checking ${products.length} sample products:`);
    let productsWithoutWeight = 0;
    let productsWithoutDimensions = 0;

    products.forEach(product => {
      const hasWeight = product.weight && product.weight > 0;
      const hasDimensions = product.width && product.height && product.depth;

      if (!hasWeight) productsWithoutWeight++;
      if (!hasDimensions) productsWithoutDimensions++;

      console.log(`     - ${product.name}`);
      console.log(`       Weight: ${hasWeight ? product.weight : '❌ NOT SET'}`);
      console.log(`       Dimensions: ${hasDimensions ? `${product.width}x${product.height}x${product.depth}` : '⚠️  NOT SET'}`);
    });

    if (productsWithoutWeight > 0) {
      console.log(`\n   ⚠️  ${productsWithoutWeight}/${products.length} products missing weight`);
      console.log('   ShipperHQ requires weight to calculate shipping!');
    }

    if (productsWithoutDimensions > 0) {
      console.log(`   ⚠️  ${productsWithoutDimensions}/${products.length} products missing dimensions`);
      console.log('   May affect shipping calculation accuracy');
    }

    console.log('\n✅ ShipperHQ integration check complete!');
    console.log('\nNext Steps:');
    console.log('1. Access ShipperHQ dashboard via BigCommerce');
    console.log('2. Verify connection status');
    console.log('3. Check shipping rules for Australia');
    console.log('4. Test rates with Australian addresses');
    console.log('5. Ensure products have weight/dimensions\n');

  } catch (error) {
    console.error('\n❌ Error checking ShipperHQ integration:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

checkShipperHQ();
