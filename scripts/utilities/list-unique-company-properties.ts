/**
 * List ALL company properties that are set as unique
 * This helps identify which of the 10 unique slots are being used
 */

import { hubspotClient } from '../../shared/libs/hubspot';

async function listUniqueProperties() {
  console.log('🔍 Fetching all company properties...\n');

  try {
    // Get all company properties
    const properties = await hubspotClient.client.crm.properties.coreApi.getAll('companies');

    // Filter to only unique properties
    const uniqueProperties = properties.results.filter((prop: any) => prop.hasUniqueValue);

    console.log(`Found ${uniqueProperties.length}/10 unique company properties:\n`);
    console.log('='.repeat(80));

    uniqueProperties.forEach((prop: any, index: number) => {
      const isStandard = !prop.name.startsWith('custom_') && prop.createdUserId === null;
      const type = isStandard ? 'STANDARD' : 'CUSTOM';

      console.log(`${index + 1}. ${prop.name}`);
      console.log(`   Label: ${prop.label}`);
      console.log(`   Type: ${type}`);
      console.log(`   Field Type: ${prop.type}`);
      console.log(`   Group: ${prop.groupName}`);
      console.log('   ' + '-'.repeat(76));
    });

    console.log('\n' + '='.repeat(80));
    console.log(`Total unique properties: ${uniqueProperties.length}/10`);
    console.log(`Available slots: ${10 - uniqueProperties.length}/10`);
    console.log('='.repeat(80));

    if (uniqueProperties.length >= 10) {
      console.log('\n⚠️  LIMIT REACHED: All 10 unique property slots are used!');
      console.log('\nTo add lead_id as unique, you must archive one of the properties above.');
      console.log('Recommended to archive from this list:');

      const ourProblematic = [
        'open_rate',
        'click_rate',
        'bounce_rate',
        'engagement_score',
        'email_engagement_score',
        'total_emails_opened',
        'total_emails_clicked',
        'category_score',
        'assigned_category'
      ];

      const toArchive = uniqueProperties.filter((p: any) =>
        ourProblematic.includes(p.name)
      );

      if (toArchive.length > 0) {
        console.log('\nProperties that should NOT be unique (safe to archive):');
        toArchive.forEach((p: any) => {
          console.log(`   - ${p.name} (${p.label})`);
        });
      }
    } else {
      console.log(`\n✅ You have ${10 - uniqueProperties.length} slot(s) available for lead_id!`);
    }

    // Check if lead_id exists and its status
    console.log('\n' + '='.repeat(80));
    console.log('Checking lead_id status...');
    try {
      const leadId = await hubspotClient.client.crm.properties.coreApi.getByName(
        'companies',
        'lead_id'
      );
      console.log(`✅ lead_id exists: ${leadId.label}`);
      console.log(`   Unique: ${leadId.hasUniqueValue ? 'YES' : 'NO'}`);
      console.log(`   Archived: ${leadId.archived ? 'YES' : 'NO'}`);
    } catch (error) {
      console.log('❌ lead_id does not exist - needs to be created');
    }

    return uniqueProperties;

  } catch (error) {
    console.error('❌ Error fetching properties:', error);
    throw error;
  }
}

listUniqueProperties()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to list properties');
    process.exit(1);
  });
