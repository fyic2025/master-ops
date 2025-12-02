/**
 * Create lead_id and the 8 engagement properties
 */

import { hubspotClient } from './shared/libs/hubspot';

async function createProperties() {
  console.log('🔨 Creating HubSpot properties...\n');

  const results = {
    created: [] as string[],
    failed: [] as any[],
  };

  // Step 1: Create lead_id (or lead_id1 if needed)
  console.log('Step 1: Creating lead_id...\n');

  let leadIdName = 'lead_id';
  try {
    console.log('  Trying to create lead_id...');
    await hubspotClient.client.crm.properties.coreApi.create('companies', {
      name: 'lead_id',
      label: 'Lead ID',
      type: 'string',
      fieldType: 'text',
      groupName: 'companyinformation',
      description: 'Unique identifier from lead database (Supabase)',
      hasUniqueValue: true,
    } as any);
    results.created.push('lead_id');
    console.log('  ✅ lead_id created as unique');
  } catch (error: any) {
    const errorMsg = error.message || String(error);

    // Check if it's because the property already exists
    if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
      console.log('  ⚠️  lead_id already exists, trying lead_id1...');
      leadIdName = 'lead_id1';

      try {
        await hubspotClient.client.crm.properties.coreApi.create('companies', {
          name: 'lead_id1',
          label: 'Lead ID',
          type: 'string',
          fieldType: 'text',
          groupName: 'companyinformation',
          description: 'Unique identifier from lead database (Supabase)',
          hasUniqueValue: true,
        } as any);
        results.created.push('lead_id1');
        console.log('  ✅ lead_id1 created as unique');
      } catch (error2: any) {
        results.failed.push({ property: 'lead_id/lead_id1', error: error2.message || String(error2) });
        console.error('  ❌ Failed to create lead_id1:', error2.message || String(error2));
      }
    } else {
      results.failed.push({ property: 'lead_id', error: errorMsg });
      console.error('  ❌ Failed to create lead_id:', errorMsg);
    }
  }

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 2: Create the 8 engagement properties
  console.log('\nStep 2: Creating engagement properties...\n');

  const properties = [
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

  for (const prop of properties) {
    try {
      console.log(`  Creating ${prop.name}...`);
      await hubspotClient.client.crm.properties.coreApi.create('companies', prop as any);
      results.created.push(prop.name);
      console.log(`  ✅ ${prop.name} created (not unique)`);

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      results.failed.push({ property: prop.name, error: errorMsg });
      console.error(`  ❌ ${prop.name} failed:`, errorMsg);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Created: ${results.created.length}/10`);
  if (results.created.length > 0) {
    results.created.forEach(prop => console.log(`   - ${prop}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(err => {
      console.log(`   - ${err.property}: ${err.error.substring(0, 100)}...`);
    });
  }

  if (results.created.length === 10) {
    console.log('\n🎉 All properties created successfully!');

    if (leadIdName === 'lead_id1') {
      console.log('\n⚠️  NOTE: Created as "lead_id1" instead of "lead_id"');
      console.log('   You\'ll need to update sync-businesses-to-hubspot.ts to use "lead_id1"');
    }
  }

  return { results, leadIdName };
}

createProperties()
  .then(({ results, leadIdName }) => {
    if (results.created.length === 10) {
      console.log('\n✨ Next: Update sync script and run verification');
    }
    process.exit(results.failed.length === 0 ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
