# HubSpot Integration Library

A comprehensive TypeScript library for integrating with HubSpot CRM. Provides both SDK-based and direct API access methods.

## Features

- **Three Access Methods**: SDK client, direct API calls, and pre-configured instances
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Environment-Aware**: Automatically loads credentials from environment variables
- **Comprehensive**: Covers contacts, companies, deals, and more
- **Flexible**: Use the official SDK or make direct HTTP calls

## Installation

The required packages are already installed:
- `@hubspot/api-client` - Official HubSpot Node.js SDK
- `dotenv` - Environment variable management

## Configuration

### Environment Variables

Create or update your `.env` file in the project root:

```env
HUBSPOT_ACCESS_TOKEN=your_access_token_here
```

Your access token is already configured in `.env`.

## Usage

### Option 1: SDK Client (Recommended)

The SDK client provides the most robust and feature-rich access to HubSpot:

```typescript
import { HubSpotClient } from './shared/libs/hubspot';

// Create a new client instance
const hubspot = new HubSpotClient();

// Get all contacts
const contacts = await hubspot.getContacts(100);

// Search for contacts by email
const contact = await hubspot.getContactByEmail('user@example.com');

// Create a new contact
const newContact = await hubspot.createContact({
  email: 'newuser@example.com',
  firstname: 'John',
  lastname: 'Doe',
  phone: '+1234567890',
  company: 'Acme Corp'
});

// Update a contact
await hubspot.updateContact('contact-id', {
  firstname: 'Jane',
  lifecyclestage: 'customer'
});

// Search with custom criteria
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

// Get companies
const companies = await hubspot.getCompanies(50);

// Get deals
const deals = await hubspot.getDeals(50);

// Create a deal
const newDeal = await hubspot.createDeal({
  dealname: 'Big Sale',
  amount: '50000',
  dealstage: 'qualifiedtobuy',
  pipeline: 'default'
});
```

### Option 2: Direct API Access

For more control or accessing endpoints not covered by the SDK:

```typescript
import { HubSpotAPI } from './shared/libs/hubspot';

// Create a new API instance
const api = new HubSpotAPI();

// Make GET requests
const contacts = await api.get('/crm/v3/objects/contacts', { limit: 100 });

// Make POST requests
const newContact = await api.post('/crm/v3/objects/contacts', {
  properties: {
    email: 'user@example.com',
    firstname: 'John',
    lastname: 'Doe'
  }
});

// Make PATCH requests
const updated = await api.patch('/crm/v3/objects/contacts/123', {
  properties: {
    firstname: 'Jane'
  }
});

// Make DELETE requests
await api.delete('/crm/v3/objects/contacts/123');

// Use convenience methods
const companies = await api.getCompanies(50);
const deals = await api.getDeals(50);
const accountInfo = await api.getAccountInfo();
```

### Option 3: Default Instances

For quick scripts and one-off operations:

```typescript
import { hubspotClient, hubspotAPI } from './shared/libs/hubspot';

// Use pre-configured SDK client
const contacts = await hubspotClient.getContacts();

// Use pre-configured API instance
const companies = await hubspotAPI.getCompanies();
```

## Advanced Usage

### Custom Access Token

You can pass a custom access token instead of using environment variables:

```typescript
const hubspot = new HubSpotClient('your-custom-token');
const api = new HubSpotAPI('your-custom-token');
```

### Search with Complex Filters

```typescript
const results = await hubspot.searchContacts([
  {
    filters: [
      {
        propertyName: 'email',
        operator: 'CONTAINS_TOKEN',
        value: '@example.com'
      },
      {
        propertyName: 'createdate',
        operator: 'GT',
        value: '2024-01-01'
      }
    ]
  }
]);
```

### Accessing the Raw SDK Client

For advanced operations not covered by the wrapper methods:

```typescript
const hubspot = new HubSpotClient();

// Access the raw client for any SDK operation
const response = await hubspot.client.crm.contacts.batchApi.create({
  inputs: [
    { properties: { email: 'user1@example.com', firstname: 'User', lastname: 'One' } },
    { properties: { email: 'user2@example.com', firstname: 'User', lastname: 'Two' } }
  ]
});

// Use any SDK feature
const owners = await hubspot.client.crm.owners.ownersApi.getPage();
```

## Type Definitions

The library includes comprehensive TypeScript types:

```typescript
import {
  HubSpotContact,
  HubSpotCompany,
  HubSpotDeal,
  HubSpotSearchFilter,
  HubSpotSearchFilterGroup,
  HubSpotSearchRequest,
  HubSpotSearchResponse
} from './shared/libs/hubspot';
```

## Error Handling

Both clients throw errors that you should handle:

```typescript
try {
  const contact = await hubspot.getContactByEmail('user@example.com');
} catch (error) {
  console.error('Failed to fetch contact:', error);
  // Handle error appropriately
}
```

## API Reference

### HubSpotClient Methods

- `getContacts(limit?: number)` - Get all contacts
- `searchContacts(filterGroups)` - Search contacts with filters
- `createContact(properties)` - Create a new contact
- `updateContact(contactId, properties)` - Update a contact
- `getContactByEmail(email)` - Find contact by email
- `getCompanies(limit?)` - Get all companies
- `getDeals(limit?)` - Get all deals
- `createDeal(properties)` - Create a new deal

### HubSpotAPI Methods

- `get(endpoint, params?)` - Make GET request
- `post(endpoint, data)` - Make POST request
- `patch(endpoint, data)` - Make PATCH request
- `put(endpoint, data)` - Make PUT request
- `delete(endpoint)` - Make DELETE request
- `getContacts(limit?)` - Get contacts
- `getContactById(id)` - Get contact by ID
- `createContact(properties)` - Create contact
- `updateContact(id, properties)` - Update contact
- `deleteContact(id)` - Delete contact
- `searchContacts(filterGroups, limit?)` - Search contacts
- `getCompanies(limit?)` - Get companies
- `getDeals(limit?)` - Get deals
- `createDeal(properties)` - Create deal
- `getAccountInfo()` - Get account information

## Resources

- [HubSpot API Documentation](https://developers.hubspot.com/docs/api/overview)
- [HubSpot Node.js SDK](https://github.com/HubSpot/hubspot-api-nodejs)
- [HubSpot API Endpoints](https://developers.hubspot.com/docs/api/crm/understanding-the-crm)

## License

Part of the master-ops project.
