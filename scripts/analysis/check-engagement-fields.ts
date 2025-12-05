import { hubspotClient } from '../../shared/libs/hubspot';

async function checkEngagementFields() {
  const engagementFields = [
    'total_emails_sent',
    'total_emails_opened',
    'total_emails_clicked',
    'open_rate_1',
    'click_rate',
    'bounce_rate',
    'email_engagement_score',
    'engagement_score',
    'is_opened',
    'is_clicked',
    'is_replied',
    'last_opened_at',
    'last_clicked_at',
    'last_replied_at'
  ];

  console.log('📧 Email Engagement Fields in HubSpot:\n');
  console.log('='.repeat(80));

  for (const field of engagementFields) {
    try {
      const prop = await hubspotClient.client.crm.properties.coreApi.getByName(
        'companies',
        field
      );

      console.log(`\n✅ ${field}`);
      console.log(`   Label: ${prop.label}`);
      console.log(`   Group: ${prop.groupName}`);
      console.log(`   Type: ${prop.type} (${prop.fieldType})`);

    } catch (e: any) {
      console.log(`\n❌ ${field} - not found`);
    }

    // Rate limit delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📍 To view these fields in HubSpot:');
  console.log('   1. Go to any Company record');
  console.log('   2. Look in the "Analytics Information" section');
  console.log('   3. Or search for the field name in the company properties');
}

checkEngagementFields()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
