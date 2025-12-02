/**
 * Verify all required properties exist
 */

import { hubspotClient } from './shared/libs/hubspot';

const REQUIRED_PROPERTIES = [
  { name: 'lead_id_1', shouldBeUnique: true, label: 'Lead ID 1' },
  { name: 'open_rate_1', shouldBeUnique: false, label: 'Open Rate 1' },
  { name: 'click_rate', shouldBeUnique: false, label: 'Click Rate' },
  { name: 'bounce_rate', shouldBeUnique: false, label: 'Bounce Rate' },
  { name: 'engagement_score', shouldBeUnique: false, label: 'Engagement Score' },
  { name: 'email_engagement_score', shouldBeUnique: false, label: 'Email Engagement Score' },
  { name: 'total_emails_opened', shouldBeUnique: false, label: 'Total Emails Opened' },
  { name: 'total_emails_clicked', shouldBeUnique: false, label: 'Total Emails Clicked' },
  { name: 'category_score', shouldBeUnique: false, label: 'Category Score' },
  { name: 'assigned_category', shouldBeUnique: false, label: 'Assigned Category' },
];

async function verifyAllProperties() {
  console.log('🔍 Verifying all required properties...\n');

  const results = {
    found: [] as any[],
    missing: [] as string[],
    wrongConfig: [] as any[],
  };

  for (const prop of REQUIRED_PROPERTIES) {
    try {
      const property = await hubspotClient.client.crm.properties.coreApi.getByName(
        'companies',
        prop.name
      );

      const isCorrect = property.hasUniqueValue === prop.shouldBeUnique;

      if (isCorrect) {
        console.log(`  ✅ ${prop.name} - exists and configured correctly`);
        results.found.push(prop.name);
      } else {
        console.log(`  ⚠️  ${prop.name} - exists but wrong config (unique: ${property.hasUniqueValue}, should be: ${prop.shouldBeUnique})`);
        results.wrongConfig.push({
          name: prop.name,
          currentUnique: property.hasUniqueValue,
          shouldBeUnique: prop.shouldBeUnique,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.log(`  ❌ ${prop.name} - NOT FOUND`);
      results.missing.push(prop.name);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Correctly configured: ${results.found.length}/${REQUIRED_PROPERTIES.length}`);
  console.log(`❌ Missing: ${results.missing.length}`);
  console.log(`⚠️  Wrong configuration: ${results.wrongConfig.length}`);

  if (results.missing.length > 0) {
    console.log('\nMissing properties:');
    results.missing.forEach(name => console.log(`   - ${name}`));
  }

  if (results.wrongConfig.length > 0) {
    console.log('\nWrong configuration:');
    results.wrongConfig.forEach(prop => {
      console.log(`   - ${prop.name}: unique=${prop.currentUnique} (should be ${prop.shouldBeUnique})`);
    });
  }

  if (results.found.length === REQUIRED_PROPERTIES.length) {
    console.log('\n🎉 All properties are correctly configured!');
    console.log('✨ Next: Update sync script with correct field names');
  }

  return results;
}

verifyAllProperties()
  .then(results => {
    process.exit(results.found.length === REQUIRED_PROPERTIES.length ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
