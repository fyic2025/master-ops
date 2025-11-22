#!/usr/bin/env tsx

/**
 * Check Buy Organics Online Shipping Configuration
 *
 * Store requirement: Only ships within Australia
 * This script checks if shipping zones are properly configured
 */

import 'dotenv/config'
import { bigcommerceClient } from './shared/libs/integrations/bigcommerce'

async function checkShippingConfig() {
  console.log('\n🚚 Buy Organics Online - Shipping Configuration Check');
  console.log('====================================================\n');
  console.log('Store Requirement: Ship within Australia ONLY\n');

  try {
    // Get store info
    const store = await bigcommerceClient.store.get();
    console.log('Store Information:');
    console.log(`  Name: ${store.name}`);
    console.log(`  Domain: ${store.domain}`);
    console.log(`  Currency: ${store.currency}`);
    console.log(`  Country: ${store.country || 'N/A'}`);
    console.log('');

    // Get shipping zones
    console.log('Fetching shipping zones...');
    const zones = await bigcommerceClient.shipping.listZones();
    console.log(`Found ${zones.length} shipping zone(s)\n`);

    for (const zone of zones) {
      console.log(`📦 Zone ${zone.id}: ${zone.name}`);
      console.log(`   Type: ${zone.type}`);
      console.log(`   Enabled: ${zone.enabled}`);

      if (zone.locations) {
        console.log(`   Locations:`);
        zone.locations.forEach((loc: any) => {
          console.log(`     - Country: ${loc.country_iso2 || loc.country || 'N/A'}`);
          if (loc.state) console.log(`       State: ${loc.state}`);
          if (loc.zip) console.log(`       Zip: ${loc.zip}`);
        });
      }

      // Get shipping methods for this zone
      const methods = await bigcommerceClient.shipping.listMethods(zone.id);
      console.log(`   Methods: ${methods.length} configured`);

      methods.forEach((method: any) => {
        console.log(`     - ${method.name} (${method.type})`);
        console.log(`       Enabled: ${method.enabled}`);
        if (method.settings) {
          if (method.settings.rate) console.log(`       Rate: $${method.settings.rate}`);
        }
      });
      console.log('');
    }

    // Analysis
    console.log('📊 Analysis');
    console.log('===========\n');

    const australiaZones = zones.filter((z: any) => {
      if (!z.locations) return false;
      return z.locations.some((loc: any) =>
        loc.country_iso2 === 'AU' ||
        loc.country === 'Australia' ||
        loc.country === 'AU'
      );
    });

    const internationalZones = zones.filter((z: any) => {
      if (!z.locations) return false;
      return z.locations.some((loc: any) =>
        loc.country_iso2 !== 'AU' &&
        loc.country !== 'Australia' &&
        loc.country !== 'AU'
      );
    });

    console.log(`✅ Australia-only shipping zones: ${australiaZones.length}`);
    if (internationalZones.length > 0) {
      console.log(`⚠️  International shipping zones: ${internationalZones.length}`);
      console.log('   WARNING: Store should only ship within Australia!');
      console.log('   Consider disabling international shipping zones.\n');

      internationalZones.forEach((z: any) => {
        console.log(`   - Zone "${z.name}" (ID: ${z.id})`);
        z.locations?.forEach((loc: any) => {
          console.log(`     Country: ${loc.country_iso2 || loc.country}`);
        });
      });
    } else {
      console.log('✅ No international shipping zones found (correct!)');
    }

    console.log('\n💡 Recommendations:');
    if (internationalZones.length > 0) {
      console.log('   1. Disable or delete international shipping zones');
      console.log('   2. Ensure all zones are restricted to Australia (AU)');
    } else {
      console.log('   ✅ Shipping configuration looks correct for Australia-only shipping');
    }

    // Check for potential checkout issues
    console.log('\n🔍 Potential Checkout Issues:');
    const enabledZones = zones.filter((z: any) => z.enabled);
    const zonesWithMethods = [];

    for (const zone of enabledZones) {
      const methods = await bigcommerceClient.shipping.listMethods(zone.id);
      const enabledMethods = methods.filter((m: any) => m.enabled);
      if (enabledMethods.length > 0) {
        zonesWithMethods.push({ zone, methodCount: enabledMethods.length });
      }
    }

    if (zonesWithMethods.length === 0) {
      console.log('   ⚠️  WARNING: No enabled shipping zones with active methods!');
      console.log('   This will cause "unable to ship" errors at checkout.');
    } else {
      console.log(`   ✅ ${zonesWithMethods.length} enabled zone(s) with active shipping methods`);
      zonesWithMethods.forEach(({ zone, methodCount }: any) => {
        console.log(`      - ${zone.name}: ${methodCount} method(s) active`);
      });
    }

    console.log('\n✅ Shipping configuration check complete!\n');

  } catch (error) {
    console.error('\n❌ Error checking shipping configuration:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

checkShippingConfig();
