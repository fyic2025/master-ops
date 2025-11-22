# Examples Directory

Practical examples demonstrating how to use the master-ops integration layer and utilities.

## Available Examples

### 1. Basic HubSpot Usage

**File**: [01-basic-hubspot-usage.ts](01-basic-hubspot-usage.ts)

Demonstrates:
- Listing companies and contacts
- Fetching property schemas
- Creating records
- Batch operations
- Error handling
- Custom logging

**Run**:
```bash
npx tsx examples/01-basic-hubspot-usage.ts
```

**What You'll Learn**:
- How to use the HubSpot connector
- Automatic rate limiting in action
- How retries work on failures
- How operations are logged to Supabase

---

### 2. Sync Business to HubSpot

**File**: [02-sync-business-to-hubspot.ts](02-sync-business-to-hubspot.ts)

Demonstrates:
- Fetching data from Supabase
- Checking for existing records in HubSpot
- Creating or updating companies
- Syncing HubSpot IDs back to Supabase
- Complete error handling workflow

**Run**:
```bash
# Sync all businesses
npx tsx examples/02-sync-business-to-hubspot.ts

# Sync specific business
npx tsx examples/02-sync-business-to-hubspot.ts --business=teelixir
```

**What You'll Learn**:
- Building complete sync workflows
- Handling create vs update logic
- Error recovery patterns
- Logging sync operations

---

### 3. n8n Workflow Management

**File**: [03-n8n-workflow-management.ts](03-n8n-workflow-management.ts)

Demonstrates:
- Listing workflows
- Getting workflow details
- Viewing execution history
- Calculating workflow statistics
- Finding failed executions
- Activating/deactivating workflows

**Run**:
```bash
npx tsx examples/03-n8n-workflow-management.ts
```

**What You'll Learn**:
- Managing n8n workflows programmatically
- Monitoring workflow health
- Analyzing execution patterns
- Implementing workflow observability

---

## Running Examples

### Prerequisites

1. **Environment Variables** - Ensure `.env` is configured:
   ```bash
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   HUBSPOT_ACCESS_TOKEN=...
   N8N_BASE_URL=...
   N8N_API_KEY=...
   ```

2. **Database Schemas** - Deploy Supabase schemas:
   - `infra/supabase/schema-integration-logs.sql`
   - `infra/supabase/schema-business-views.sql`

3. **Dependencies** - Install packages:
   ```bash
   npm install
   ```

### Execution

```bash
# Run any example
npx tsx examples/<example-name>.ts

# With verbose logging
LOG_LEVEL=debug npx tsx examples/<example-name>.ts
```

### Viewing Results

After running examples, check results:

```bash
# View logged operations
ops logs --source=hubspot
ops logs --source=n8n

# View statistics
ops stats

# Query database directly
ops db:query integration_logs --limit=20
```

---

## Creating Your Own Examples

### Template

```typescript
#!/usr/bin/env tsx
/**
 * Example: Your Example Name
 *
 * Brief description of what this demonstrates
 *
 * Usage:
 *   npx tsx examples/your-example.ts
 */

import { hubspotClient, logger } from '../shared/libs/integrations'

async function main() {
  console.log('🚀 Your Example\n')

  try {
    // Your code here
    const result = await hubspotClient.contacts.list({ limit: 10 })

    // Log results
    logger.info('Operation completed', {
      source: 'hubspot',
      operation: 'yourOperation',
      metadata: { count: result.results.length }
    })

    console.log('✅ Example completed!')

  } catch (error) {
    console.error('❌ Error:', (error as Error).message)
    logger.error('Example failed', {
      source: 'hubspot',
      operation: 'yourOperation',
    }, error as Error)
    process.exit(1)
  }
}

main()
```

### Best Practices

1. **Always use try-catch** - Handle errors gracefully
2. **Log operations** - Use logger for observability
3. **Add console output** - Help users understand what's happening
4. **Comment your code** - Explain why, not just what
5. **Use TypeScript** - Leverage type safety
6. **Make it runnable** - Include shebang and usage comments

---

## Common Patterns

### Pattern 1: Fetch and Process

```typescript
// Fetch data
const response = await hubspotClient.contacts.list({ limit: 100 })

// Process each item
for (const contact of response.results) {
  await processContact(contact)
}
```

### Pattern 2: Create or Update

```typescript
async function syncItem(data: any) {
  if (data.externalId) {
    // Update existing
    return await hubspotClient.contacts.update(data.externalId, data)
  } else {
    // Create new
    return await hubspotClient.contacts.create(data)
  }
}
```

### Pattern 3: Batch with Error Handling

```typescript
const results = await Promise.allSettled(
  items.map(item => processItem(item))
)

const successful = results.filter(r => r.status === 'fulfilled')
const failed = results.filter(r => r.status === 'rejected')

console.log(`✅ ${successful.length} succeeded`)
console.log(`❌ ${failed.length} failed`)
```

### Pattern 4: Pagination

```typescript
let hasMore = true
let after: string | undefined

while (hasMore) {
  const response = await hubspotClient.contacts.list({
    limit: 100,
    after
  })

  // Process page
  processPage(response.results)

  // Check for more
  hasMore = !!response.paging?.next
  after = response.paging?.next?.after
}
```

---

## Troubleshooting

### Example Fails Immediately

Check environment variables:
```bash
cat .env | grep HUBSPOT
cat .env | grep SUPABASE
```

### No Logs Appearing

1. Verify database schemas are deployed
2. Check `SUPABASE_SERVICE_ROLE_KEY` is set
3. Run: `ops test-integration supabase`

### Rate Limit Errors

The connectors handle rate limiting automatically. If you still see errors:
- Check your API limits in service dashboard
- Adjust rate limiter config in connector
- Add delays between operations

---

## Next Steps

1. ✅ Run all examples to understand the patterns
2. 📝 Modify examples for your use cases
3. 🔧 Build custom integrations using the same patterns
4. 📊 Monitor operations with `ops` CLI
5. 🚀 Deploy to production workflows

---

**Last Updated**: 2025-11-20
