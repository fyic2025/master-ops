# Xero Integration

Type-safe Xero API client with OAuth 2.0 authentication, rate limiting, automatic retries, and comprehensive error handling.

## Features

- **OAuth 2.0 Authentication** - Secure token management with automatic refresh
- **Multi-tenant Support** - Work with multiple Xero organizations
- **Rate Limiting** - Built-in rate limiting (60 requests per minute)
- **Automatic Retries** - Exponential backoff for failed requests
- **Error Handling** - Comprehensive error categorization and logging
- **TypeScript Types** - Full type safety for all API responses

## Installation

```bash
# Set environment variables
XERO_CLIENT_ID=your-client-id
XERO_CLIENT_SECRET=your-client-secret
XERO_REDIRECT_URI=http://localhost:3000/callback
```

## Usage

### 1. Authentication

```typescript
import { xeroClient } from '@/shared/libs/integrations/xero'

// Generate authorization URL
const authUrl = xeroClient.getAuthorizationUrl()
// Redirect user to authUrl

// Exchange code for tokens (after user authorizes)
const token = await xeroClient.exchangeCodeForToken(code)

// Get available connections (organizations)
const connections = await xeroClient.getConnections()

// Store tokens for each tenant
connections.forEach(conn => {
  xeroClient.storeTokens(conn.tenantId, token)
})

// Set active tenant
xeroClient.setTenant(connections[0].tenantId)
```

### 2. Fetch Chart of Accounts

```typescript
// Get all accounts
const accounts = await xeroClient.accounts.list()

// Filter active accounts only
const activeAccounts = await xeroClient.accounts.list({
  where: 'Status=="ACTIVE"'
})

// Get specific account by code
const account = await xeroClient.accounts.getByCode('200')
```

### 3. Get Reports

```typescript
// Trial Balance
const trialBalance = await xeroClient.reports.getTrialBalance({
  date: '2024-12-31'
})

// Profit & Loss
const pl = await xeroClient.reports.getProfitAndLoss({
  fromDate: '2024-01-01',
  toDate: '2024-12-31',
  periods: 12,
  timeframe: 'MONTH'
})

// Balance Sheet
const bs = await xeroClient.reports.getBalanceSheet({
  date: '2024-12-31'
})
```

### 4. Fetch Transactions

```typescript
// Get invoices for a date range
const invoices = await xeroClient.invoices.list({
  where: 'Date>=DateTime(2024,1,1)&&Date<=DateTime(2024,12,31)'
})

// Get journals
const journals = await xeroClient.journals.list({
  offset: 0,
  paymentsOnly: false
})

// Get bank transactions
const bankTxns = await xeroClient.bankTransactions.list({
  fromDate: '2024-01-01',
  toDate: '2024-12-31'
})
```

### 5. Multi-Tenant Operations

```typescript
// Work with Teelixir
xeroClient.setTenant(teelixirTenantId)
const teelixirAccounts = await xeroClient.accounts.list()

// Switch to Elevate Wholesale
xeroClient.setTenant(elevateTenantId)
const elevateAccounts = await xeroClient.accounts.list()
```

## API Reference

### Organizations

- `organisations.getCurrent()` - Get current organization details

### Accounts

- `accounts.list(options?)` - List all accounts
- `accounts.get(accountId)` - Get specific account
- `accounts.getByCode(code)` - Get account by code

### Journals

- `journals.list(options?)` - List journals
- `journals.get(journalId)` - Get specific journal

### Invoices

- `invoices.list(options?)` - List invoices
- `invoices.get(invoiceId)` - Get specific invoice

### Contacts

- `contacts.list(options?)` - List contacts
- `contacts.get(contactId)` - Get specific contact
- `contacts.search(name)` - Search contacts by name

### Bank Transactions

- `bankTransactions.list(options?)` - List bank transactions
- `bankTransactions.get(transactionId)` - Get specific transaction

### Reports

- `reports.getTrialBalance(options?)` - Trial Balance report
- `reports.getProfitAndLoss(options?)` - P&L report
- `reports.getBalanceSheet(options?)` - Balance Sheet report
- `reports.getBankSummary(options?)` - Bank Summary report
- `reports.getExecutiveSummary(options?)` - Executive Summary report

## Error Handling

All methods throw `IntegrationError` with categorized error types:

```typescript
import { ErrorHandler, IntegrationError } from '../base/error-handler'

try {
  const accounts = await xeroClient.accounts.list()
} catch (error) {
  const err = error as IntegrationError

  if (err.category === 'AUTHENTICATION') {
    // Handle auth error - maybe refresh token
  } else if (err.category === 'RATE_LIMIT') {
    // Handle rate limit - retry after delay
  } else {
    // Handle other errors
  }
}
```

## Rate Limiting

The connector implements automatic rate limiting:
- **60 requests per minute** per tenant
- Token bucket algorithm
- Automatic queuing of requests

## Token Management

Tokens are automatically managed:
- **Access tokens** are refreshed 5 minutes before expiry
- **Refresh tokens** are used automatically
- Store tokens securely using `storeTokens()`

## Logging

All operations are logged to Supabase via the centralized logger:

```typescript
// Logs include:
// - Operation name
// - Duration
// - Success/failure
// - Error details
// - Tenant ID
```

## Health Check

```typescript
// Verify connectivity
const health = await xeroClient.healthCheck()
console.log(health.healthy) // true/false
```

## References

- [Xero API Documentation](https://developer.xero.com/documentation/api/accounting/overview)
- [OAuth 2.0 Guide](https://developer.xero.com/documentation/guides/oauth2/overview)
- [API Rate Limits](https://developer.xero.com/documentation/guides/oauth2/limits)
