/**
 * Verify HubSpot property unique constraints
 * Shows which properties still need to be fixed
 */

import { hubspotClient } from '../../shared/libs/hubspot';

// Properties that should NOT have unique constraints
const SHOULD_NOT_BE_UNIQUE = [
  'open_rate',
  'click_rate',
  'bounce_rate',
  'engagement_score',
  'email_engagement_score',
  'total_emails_opened',
  'total_emails_clicked',
  'category_score',
  'assigned_category',
];

// Properties that SHOULD have unique constraints
const SHOULD_BE_UNIQUE = [
  'lead_id',
];

async function verifyPropertyConstraints() {
  console.log('🔍 Verifying HubSpot property constraints...\n');

  const results = {
    correctlyConfigured: [] as string[],
    needsFix: [] as string[],
    errors: [] as any[],
  };

  // Check properties that should NOT be unique
  console.log('Checking properties that should NOT be unique:\n');
  for (const propertyName of SHOULD_NOT_BE_UNIQUE) {
    try {
      const property = await hubspotClient.client.crm.properties.coreApi.getByName(
        'companies',
        propertyName
      );

      if (property.hasUniqueValue) {
        console.log(`  ❌ ${propertyName} - STILL UNIQUE (needs manual fix)`);
        results.needsFix.push(propertyName);
      } else {
        console.log(`  ✅ ${propertyName} - correctly configured`);
        results.correctlyConfigured.push(propertyName);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      const errorMsg = error.message || String(error);
      results.errors.push({ property: propertyName, error: errorMsg });
      console.error(`  ⚠️  ${propertyName} - error checking: ${errorMsg}`);
    }
  }

  // Check properties that SHOULD be unique
  console.log('\nChecking properties that SHOULD be unique:\n');
  for (const propertyName of SHOULD_BE_UNIQUE) {
    try {
      const property = await hubspotClient.client.crm.properties.coreApi.getByName(
        'companies',
        propertyName
      );

      if (property.hasUniqueValue) {
        console.log(`  ✅ ${propertyName} - correctly set as unique`);
        results.correctlyConfigured.push(propertyName);
      } else {
        console.log(`  ❌ ${propertyName} - MISSING unique constraint (needs manual fix)`);
        results.needsFix.push(propertyName);
      }

    } catch (error: any) {
      const errorMsg = error.message || String(error);
      results.errors.push({ property: propertyName, error: errorMsg });
      console.error(`  ⚠️  ${propertyName} - error checking: ${errorMsg}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Correctly configured: ${results.correctlyConfigured.length}`);
  console.log(`❌ Need manual fix: ${results.needsFix.length}`);

  if (results.needsFix.length > 0) {
    console.log('\n🔧 Properties that need manual fixing in HubSpot UI:');
    results.needsFix.forEach(prop => {
      const shouldBeUnique = SHOULD_BE_UNIQUE.includes(prop);
      const action = shouldBeUnique ? 'CHECK "Require unique values"' : 'UNCHECK "Require unique values"';
      console.log(`   - ${prop}: ${action}`);
    });
    console.log('\n📍 Go to: Settings → Properties → Company Properties → Search for property → Rules tab');
  }

  if (results.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${results.errors.length}`);
    results.errors.forEach(err => console.log(`   - ${err.property}: ${err.error}`));
  }

  if (results.needsFix.length === 0 && results.errors.length === 0) {
    console.log('\n🎉 All properties are correctly configured!');
    console.log('✨ You can now uncomment the excluded fields in sync-businesses-to-hubspot.ts');
    console.log('   and run the full sync!');
  }

  return results;
}

verifyPropertyConstraints()
  .then(results => {
    process.exit(results.needsFix.length > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n❌ Failed to verify properties:', error);
    process.exit(1);
  });
