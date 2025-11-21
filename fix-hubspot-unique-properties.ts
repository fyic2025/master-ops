/**
 * Fix HubSpot properties by removing unique value constraint
 * from engagement metrics (keep only lead_id as unique)
 */

import { hubspotClient } from './shared/libs/hubspot';

// Properties that should NOT be unique (currently causing issues)
const PROPERTIES_TO_FIX = [
  'open_rate',
  'click_rate',
  'reply_rate',
  'bounce_rate',
  'engagement_score',
  'email_engagement_score',
  'total_emails_sent',
  'total_emails_opened',
  'total_emails_clicked',
  'total_emails_replied',
  'total_emails_bounced',
  'category_score',
  'assigned_category',
];

async function fixUniqueProperties() {
  console.log('🔧 Fixing HubSpot property unique value constraints...\n');

  const results = {
    fixed: [] as string[],
    alreadyCorrect: [] as string[],
    errors: [] as any[],
  };

  for (const propertyName of PROPERTIES_TO_FIX) {
    try {
      console.log(`Checking ${propertyName}...`);

      // Get current property settings
      const property = await hubspotClient.client.crm.properties.coreApi.getByName(
        'companies',
        propertyName
      );

      // Check if it has unique value constraint
      if (property.hasUniqueValue) {
        console.log(`  ⚠️  ${propertyName} is set as unique - fixing...`);

        // Update to remove unique constraint
        await hubspotClient.client.crm.properties.coreApi.update(
          'companies',
          propertyName,
          {
            hasUniqueValue: false,
          }
        );

        results.fixed.push(propertyName);
        console.log(`  ✅ ${propertyName} - unique constraint removed`);
      } else {
        results.alreadyCorrect.push(propertyName);
        console.log(`  ✓ ${propertyName} - already correct (not unique)`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      const errorMsg = error.message || String(error);
      results.errors.push({ property: propertyName, error: errorMsg });
      console.error(`  ❌ ${propertyName} - error: ${errorMsg}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Fixed: ${results.fixed.length}`);
  if (results.fixed.length > 0) {
    results.fixed.forEach(prop => console.log(`   - ${prop}`));
  }

  console.log(`\n✓ Already correct: ${results.alreadyCorrect.length}`);
  if (results.alreadyCorrect.length > 0) {
    results.alreadyCorrect.forEach(prop => console.log(`   - ${prop}`));
  }

  if (results.errors.length > 0) {
    console.log(`\n❌ Errors: ${results.errors.length}`);
    results.errors.forEach(err => console.log(`   - ${err.property}: ${err.error}`));
  }

  // Verify lead_id is still unique
  console.log('\n' + '='.repeat(60));
  console.log('Verifying lead_id unique constraint...');
  try {
    const leadIdProp = await hubspotClient.client.crm.properties.coreApi.getByName(
      'companies',
      'lead_id'
    );

    if (leadIdProp.hasUniqueValue) {
      console.log('✅ lead_id is correctly set as unique identifier');
    } else {
      console.log('⚠️  WARNING: lead_id is NOT set as unique!');
      console.log('   Setting lead_id as unique...');

      await hubspotClient.client.crm.properties.coreApi.update(
        'companies',
        'lead_id',
        {
          hasUniqueValue: true,
        }
      );

      console.log('✅ lead_id is now set as unique');
    }
  } catch (error) {
    console.error('❌ Error checking lead_id:', error);
  }

  console.log('\n✨ Property fixes complete!');
  return results;
}

fixUniqueProperties()
  .then(results => {
    if (results.errors.length === 0) {
      console.log('\n✅ All properties fixed successfully!');
      console.log('\nYou can now run the sync script:');
      console.log('  npx tsx sync-businesses-to-hubspot.ts --test --limit=10');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to fix properties:', error);
    process.exit(1);
  });
