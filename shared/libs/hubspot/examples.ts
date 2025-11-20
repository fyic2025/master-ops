/**
 * HubSpot Integration Examples
 *
 * This file demonstrates common use cases for the HubSpot integration library.
 * Run individual functions to test the integration.
 */

import { HubSpotClient, HubSpotAPI, hubspotClient, hubspotAPI } from './index';

/**
 * Example 1: Get all contacts using SDK client
 */
export async function getContactsExample() {
  console.log('Fetching contacts using SDK client...');

  const hubspot = new HubSpotClient();
  const contacts = await hubspot.getContacts(10);

  console.log(`Found ${contacts.length} contacts:`);
  contacts.forEach(contact => {
    console.log(`- ${contact.properties.email} (${contact.properties.firstname} ${contact.properties.lastname})`);
  });

  return contacts;
}

/**
 * Example 2: Search for a contact by email
 */
export async function findContactByEmailExample(email: string = 'test@example.com') {
  console.log(`Searching for contact with email: ${email}`);

  const hubspot = new HubSpotClient();
  const contact = await hubspot.getContactByEmail(email);

  if (contact) {
    console.log('Contact found:', {
      id: contact.id,
      email: contact.properties.email,
      name: `${contact.properties.firstname} ${contact.properties.lastname}`,
      company: contact.properties.company
    });
  } else {
    console.log('Contact not found');
  }

  return contact;
}

/**
 * Example 3: Create a new contact
 */
export async function createContactExample() {
  console.log('Creating a new contact...');

  const hubspot = new HubSpotClient();
  const newContact = await hubspot.createContact({
    email: `test-${Date.now()}@example.com`,
    firstname: 'Test',
    lastname: 'User',
    phone: '+1234567890',
    company: 'Test Company',
    website: 'https://example.com',
    lifecyclestage: 'lead'
  });

  console.log('Contact created:', {
    id: newContact.id,
    email: newContact.properties.email,
    name: `${newContact.properties.firstname} ${newContact.properties.lastname}`
  });

  return newContact;
}

/**
 * Example 4: Update a contact
 */
export async function updateContactExample(contactId: string) {
  console.log(`Updating contact ${contactId}...`);

  const hubspot = new HubSpotClient();
  const updated = await hubspot.updateContact(contactId, {
    lifecyclestage: 'customer',
    hs_lead_status: 'CONNECTED'
  });

  console.log('Contact updated successfully');
  return updated;
}

/**
 * Example 5: Search contacts with filters
 */
export async function searchContactsExample() {
  console.log('Searching for contacts with lifecycle stage = lead...');

  const hubspot = new HubSpotClient();
  const results = await hubspot.searchContacts([
    {
      filters: [
        {
          propertyName: 'lifecyclestage',
          operator: 'EQ',
          value: 'lead'
        }
      ]
    }
  ]);

  console.log(`Found ${results.results.length} leads`);
  return results;
}

/**
 * Example 6: Get companies
 */
export async function getCompaniesExample() {
  console.log('Fetching companies...');

  const hubspot = new HubSpotClient();
  const companies = await hubspot.getCompanies(10);

  console.log(`Found ${companies.length} companies:`);
  companies.forEach(company => {
    console.log(`- ${company.properties.name} (${company.properties.domain})`);
  });

  return companies;
}

/**
 * Example 7: Get deals
 */
export async function getDealsExample() {
  console.log('Fetching deals...');

  const hubspot = new HubSpotClient();
  const deals = await hubspot.getDeals(10);

  console.log(`Found ${deals.length} deals:`);
  deals.forEach(deal => {
    console.log(`- ${deal.properties.dealname} - $${deal.properties.amount}`);
  });

  return deals;
}

/**
 * Example 8: Create a deal
 */
export async function createDealExample() {
  console.log('Creating a new deal...');

  const hubspot = new HubSpotClient();
  const newDeal = await hubspot.createDeal({
    dealname: `Test Deal ${Date.now()}`,
    amount: '10000',
    dealstage: 'appointmentscheduled',
    pipeline: 'default',
    closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
  });

  console.log('Deal created:', {
    id: newDeal.id,
    name: newDeal.properties.dealname,
    amount: newDeal.properties.amount
  });

  return newDeal;
}

/**
 * Example 9: Using direct API calls
 */
export async function directAPIExample() {
  console.log('Using direct API to fetch contacts...');

  const api = new HubSpotAPI();
  const response = await api.getContacts(5);

  console.log(`Found ${response.results?.length || 0} contacts via direct API`);
  return response;
}

/**
 * Example 10: Using default instances
 */
export async function defaultInstanceExample() {
  console.log('Using default client instance...');

  // Use pre-configured client
  const contacts = await hubspotClient.getContacts(5);
  console.log(`Found ${contacts.length} contacts`);

  // Use pre-configured API
  const companies = await hubspotAPI.getCompanies(5);
  console.log(`Found ${companies.results?.length || 0} companies`);

  return { contacts, companies };
}

/**
 * Example 11: Get account information
 */
export async function getAccountInfoExample() {
  console.log('Fetching HubSpot account information...');

  const api = new HubSpotAPI();
  const accountInfo = await api.getAccountInfo();

  console.log('Account Info:', accountInfo);
  return accountInfo;
}

/**
 * Example 12: Advanced search with multiple filters
 */
export async function advancedSearchExample() {
  console.log('Performing advanced search...');

  const hubspot = new HubSpotClient();
  const results = await hubspot.searchContacts([
    {
      filters: [
        {
          propertyName: 'createdate',
          operator: 'GT',
          value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime().toString() // Last 30 days
        }
      ]
    }
  ]);

  console.log(`Found ${results.results.length} contacts created in the last 30 days`);
  return results;
}

/**
 * Example 13: Error handling
 */
export async function errorHandlingExample() {
  console.log('Demonstrating error handling...');

  const hubspot = new HubSpotClient();

  try {
    // Try to get a non-existent contact
    const contact = await hubspot.getContactByEmail('nonexistent@example.com');
    console.log('Contact found:', contact);
  } catch (error) {
    console.error('Error caught:', error instanceof Error ? error.message : error);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('=== Running HubSpot Integration Examples ===\n');

  try {
    // Example 1: Get contacts
    await getContactsExample();
    console.log('\n---\n');

    // Example 6: Get companies
    await getCompaniesExample();
    console.log('\n---\n');

    // Example 7: Get deals
    await getDealsExample();
    console.log('\n---\n');

    // Example 9: Direct API
    await directAPIExample();
    console.log('\n---\n');

    // Example 11: Account info
    await getAccountInfoExample();
    console.log('\n---\n');

    console.log('=== All examples completed successfully! ===');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to run examples
// runAllExamples().catch(console.error);
