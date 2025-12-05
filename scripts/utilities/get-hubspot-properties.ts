/**
 * Get HubSpot company properties to understand field mapping
 */

import { hubspotClient } from '../../shared/libs/hubspot';

async function getHubSpotProperties() {
  console.log('🔍 Fetching HubSpot company properties...\n');

  try {
    // Get all company properties
    const properties = await hubspotClient.client.crm.properties.coreApi.getAll('companies');

    console.log(`✅ Found ${properties.results.length} company properties\n`);

    // Separate mandatory and custom properties
    const mandatoryProps = properties.results.filter(
      (prop: any) => prop.name && (
        prop.name === 'name' ||
        prop.name === 'domain' ||
        prop.name === 'phone' ||
        prop.name === 'address' ||
        prop.name === 'city' ||
        prop.name === 'state' ||
        prop.name === 'zip' ||
        prop.name === 'country' ||
        prop.name === 'industry' ||
        prop.name === 'website'
      )
    );

    const customProps = properties.results.filter(
      (prop: any) => prop.name && prop.name.startsWith('custom_') ||
      (prop.createdUserId && !prop.name.startsWith('hs_'))
    );

    console.log('📋 Mandatory/Standard Properties:');
    mandatoryProps.forEach((prop: any) => {
      console.log(`   ${prop.name} (${prop.type}) - ${prop.label}`);
    });
    console.log('');

    console.log('🔧 Custom Properties:');
    if (customProps.length > 0) {
      customProps.forEach((prop: any) => {
        console.log(`   ${prop.name} (${prop.type}) - ${prop.label}`);
      });
    } else {
      console.log('   No custom properties found');
    }
    console.log('');

    // Show all properties grouped by type
    const groupedByType = properties.results.reduce((acc: any, prop: any) => {
      const type = prop.groupName || 'Other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(prop);
      return acc;
    }, {});

    console.log('📊 Properties by Group:');
    Object.entries(groupedByType).forEach(([group, props]: [string, any]) => {
      console.log(`\n${group} (${props.length} properties):`);
      props.slice(0, 10).forEach((prop: any) => {
        const required = prop.required ? '(REQUIRED)' : '';
        console.log(`   - ${prop.name}: ${prop.label} ${required}`);
      });
      if (props.length > 10) {
        console.log(`   ... and ${props.length - 10} more`);
      }
    });

    // Save to file for reference
    const fs = require('fs');
    fs.writeFileSync(
      'hubspot-properties.json',
      JSON.stringify(properties.results, null, 2)
    );
    console.log('\n💾 Full properties list saved to hubspot-properties.json');

    return properties.results;

  } catch (error) {
    console.error('❌ Error fetching HubSpot properties:', error);
    throw error;
  }
}

getHubSpotProperties()
  .then(props => {
    console.log(`\n✨ Successfully fetched ${props.length} properties!`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to fetch properties');
    process.exit(1);
  });
