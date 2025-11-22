/**
 * Comprehensive fix for HubSpot property unique constraints
 * 1. Archive problematic unique fields
 * 2. Create lead_id as unique
 * 3. Recreate the 8 fields without unique constraints
 */

import { hubspotClient } from './shared/libs/hubspot';

// Properties to archive (incorrectly set as unique)
const TO_ARCHIVE = [
  'assigned_category',
  'bounce_rate',
  'category_score',
  'click_rate',
  'email_engagement_score',
  'engagement_score',
  'total_emails_clicked',
  'total_emails_opened',
];

// Property definitions for recreation (without unique constraint)
const PROPERTY_DEFINITIONS = [
  {
    name: 'open_rate',
    label: 'Open rate',
    type: 'number',
    fieldType: 'number',
    groupName: 'analyticsinformation',
    description: 'Email open rate percentage',
    hasUniqueValue: false,
  },
  {
    name: 'click_rate',
    label: 'Click rate',
    type: 'number',
    fieldType: 'number',
    groupName: 'analyticsinformation',
    description: 'Email click rate percentage',
    hasUniqueValue: false,
  },
  {
    name: 'bounce_rate',
    label: 'Bounce rate',
    type: 'number',
    fieldType: 'number',
    groupName: 'analyticsinformation',
    description: 'Email bounce rate percentage',
    hasUniqueValue: false,
  },
  {
    name: 'engagement_score',
    label: 'Engagement score',
    type: 'number',
    fieldType: 'number',
    groupName: 'analyticsinformation',
    description: 'Overall engagement score',
    hasUniqueValue: false,
  },
  {
    name: 'email_engagement_score',
    label: 'Email engagement score',
    type: 'number',
    fieldType: 'number',
    groupName: 'analyticsinformation',
    description: 'Email-specific engagement score',
    hasUniqueValue: false,
  },
  {
    name: 'total_emails_opened',
    label: 'Total emails opened',
    type: 'number',
    fieldType: 'number',
    groupName: 'analyticsinformation',
    description: 'Total number of emails opened',
    hasUniqueValue: false,
  },
  {
    name: 'total_emails_clicked',
    label: 'Total emails clicked',
    type: 'number',
    fieldType: 'number',
    groupName: 'analyticsinformation',
    description: 'Total number of emails clicked',
    hasUniqueValue: false,
  },
  {
    name: 'category_score',
    label: 'Category score',
    type: 'number',
    fieldType: 'number',
    groupName: 'companyinformation',
    description: 'Business category confidence score',
    hasUniqueValue: false,
  },
  {
    name: 'assigned_category',
    label: 'Assigned category',
    type: 'string',
    fieldType: 'text',
    groupName: 'companyinformation',
    description: 'Assigned business category',
    hasUniqueValue: false,
  },
];

async function fixAllProperties() {
  console.log('🔧 Starting comprehensive property fix...\n');

  const results = {
    archived: [] as string[],
    leadIdCreated: false,
    recreated: [] as string[],
    errors: [] as any[],
  };

  // Step 1: Archive problematic unique properties
  console.log('Step 1: Archiving problematic unique properties...\n');
  for (const propertyName of TO_ARCHIVE) {
    try {
      console.log(`  Archiving ${propertyName}...`);
      await hubspotClient.client.crm.properties.coreApi.archive(
        'companies',
        propertyName
      );
      results.archived.push(propertyName);
      console.log(`  ✅ ${propertyName} archived`);

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      results.errors.push({ step: 'archive', property: propertyName, error: errorMsg });
      console.error(`  ❌ ${propertyName} - failed: ${errorMsg}`);
    }
  }

  // Step 2: Create lead_id as unique
  console.log('\nStep 2: Creating lead_id as unique property...\n');
  try {
    console.log('  Creating lead_id...');
    await hubspotClient.client.crm.properties.coreApi.create('companies', {
      name: 'lead_id',
      label: 'Lead ID',
      type: 'string',
      fieldType: 'text',
      groupName: 'companyinformation',
      description: 'Unique identifier from lead database (Supabase)',
      hasUniqueValue: true,
    } as any);
    results.leadIdCreated = true;
    console.log('  ✅ lead_id created as unique property');
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    results.errors.push({ step: 'create_lead_id', property: 'lead_id', error: errorMsg });
    console.error(`  ❌ Failed to create lead_id: ${errorMsg}`);
  }

  // Wait a bit before recreating
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 3: Recreate the 8 properties WITHOUT unique constraint
  console.log('\nStep 3: Recreating properties without unique constraint...\n');
  for (const propDef of PROPERTY_DEFINITIONS) {
    try {
      console.log(`  Creating ${propDef.name}...`);
      await hubspotClient.client.crm.properties.coreApi.create('companies', propDef as any);
      results.recreated.push(propDef.name);
      console.log(`  ✅ ${propDef.name} created (not unique)`);

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      results.errors.push({ step: 'recreate', property: propDef.name, error: errorMsg });
      console.error(`  ❌ ${propDef.name} - failed: ${errorMsg}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Archived: ${results.archived.length}/${TO_ARCHIVE.length}`);
  if (results.archived.length > 0) {
    results.archived.forEach(prop => console.log(`   - ${prop}`));
  }

  console.log(`\n✅ Lead ID created: ${results.leadIdCreated ? 'YES' : 'NO'}`);

  console.log(`\n✅ Recreated: ${results.recreated.length}/${PROPERTY_DEFINITIONS.length}`);
  if (results.recreated.length > 0) {
    results.recreated.forEach(prop => console.log(`   - ${prop}`));
  }

  if (results.errors.length > 0) {
    console.log(`\n❌ Errors: ${results.errors.length}`);
    results.errors.forEach(err => {
      console.log(`   [${err.step}] ${err.property}: ${err.error}`);
    });
  }

  console.log('\n' + '='.repeat(80));

  if (results.errors.length === 0 && results.leadIdCreated && results.recreated.length === PROPERTY_DEFINITIONS.length) {
    console.log('🎉 All properties fixed successfully!');
    console.log('✨ Next step: Uncomment fields in sync-businesses-to-hubspot.ts and run sync');
  } else {
    console.log('⚠️  Some operations failed - review errors above');
  }

  return results;
}

fixAllProperties()
  .then(results => {
    const success = results.errors.length === 0 &&
                   results.leadIdCreated &&
                   results.recreated.length === PROPERTY_DEFINITIONS.length;
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
