# Unleashed Workflow Authentication Fix

## Problem
The workflow was missing proper authentication headers for the Unleashed API.

## Solution
Updated the "Prepare Signature String" node to generate HMAC-SHA256 signatures.

## Required Credentials

You need to get these from Unleashed:

1. **API Auth ID** (API Key) - Get from: Unleashed → Setup → Integration
2. **API Auth Secret** - Get from: Unleashed → Setup → Integration

## Code for "Prepare Signature String" Node

```javascript
// Unleashed API Authentication
// Requires HMAC-SHA256 signature

// IMPORTANT: Set these as environment variables or n8n credentials
const API_AUTH_ID = 'YOUR_UNLEASHED_API_KEY'     // Replace with your API key
const API_AUTH_SECRET = 'YOUR_UNLEASHED_API_SECRET' // Replace with your API secret

const method = 'POST'
const url = 'https://api.unleashedsoftware.com/SalesOrders'
const queryString = '' // Empty for POST requests

// Create signature string: <method><url><query_string>
const signatureString = method + url + queryString

// Generate HMAC-SHA256 signature
const signature = crypto
  .createHmac('sha256', API_AUTH_SECRET)
  .update(signatureString)
  .digest('base64')

// Return the current item data plus auth headers
const items = $input.all()
return items.map(item => ({
  json: {
    ...item.json,
    _authHeaders: {
      'api-auth-id': API_AUTH_ID,
      'api-auth-signature': signature
    }
  }
}))
```

## Steps to Apply Fix

1. Open workflow in n8n: https://automation.growthcohq.com/workflow/lj35rsDvrz5LK9Ox
2. Delete the "Prepare Signature String" Set node
3. Add a new Code node named "Prepare Signature String"
4. Paste the code above
5. Replace YOUR_UNLEASHED_API_KEY and YOUR_UNLEASHED_API_SECRET
6. Reconnect: Prepare Unleashed Data → Prepare Signature String → Create in Unleashed
7. Test manually with one order
8. Once working, activate the workflow

## Testing

After applying the fix:

1. Manually trigger the workflow
2. Check execution logs
3. Verify the API response has a "Guid" field (success indicator)
4. Check Google Sheet for "Synced" status update

## Expected Results

- Success rate should improve from 56% to 95%+
- Failed executions should drop significantly
- Unleashed orders should be created successfully