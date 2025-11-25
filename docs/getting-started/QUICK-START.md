# Master-Ops Quick Start Guide

Get up and running with the enhanced master-ops platform in minutes.

---

## 1️⃣ Initial Setup (5 minutes)

### Install Dependencies

```bash
cd /root/master-ops
npm install
```

### Create ops Alias (Optional but Recommended)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
alias ops='npx tsx /root/master-ops/tools/ops-cli/index.ts'
```

Then reload:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

---

## 2️⃣ Deploy Database Schemas (5 minutes)

### Option A: Via Supabase Dashboard (Recommended)

1. Go to [your Supabase project](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste contents of `infra/supabase/schema-integration-logs.sql`
5. Click **Run**
6. Repeat for `infra/supabase/schema-business-views.sql`

### Option B: Via psql CLI

```bash
# Set your database URL
export DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# Run schemas
psql $DATABASE_URL < infra/supabase/schema-integration-logs.sql
psql $DATABASE_URL < infra/supabase/schema-business-views.sql
```

---

## 3️⃣ Verify Setup (2 minutes)

### Test Health Check

```bash
npx tsx tools/health-checks/integration-health-check.ts
```

You should see:
```
================================================================================
INTEGRATION HEALTH CHECK RESULTS
================================================================================
Timestamp: 2025-11-20T...
Total Services: 3
Healthy: 3 ✓
Unhealthy: 0 ✗
================================================================================

✓ HEALTHY SUPABASE
  Response Time: 150ms

✓ HEALTHY HUBSPOT
  Response Time: 250ms

✓ HEALTHY N8N
  Response Time: 180ms
================================================================================
```

### Test CLI

```bash
ops --help              # See all commands
ops health-check        # Run health check
ops stats               # View statistics
```

---

## 4️⃣ Common Operations

### Monitor System Health

```bash
# Check all integrations
ops health-check

# Check specific service
ops health-check --services=hubspot

# Verbose output with details
ops health-check --verbose
```

### View Logs

```bash
# Recent logs
ops logs

# Filter by source
ops logs --source=hubspot

# Show only errors
ops logs --errors-only

# Last 100 logs
ops logs -n 100

# Combine filters
ops logs --source=hubspot --errors-only -n 50
```

### Check Statistics

```bash
# Last 24 hours (default)
ops stats

# Custom time range
ops stats --hours=48
```

### Monitor Workflows

```bash
# Workflow performance summary
ops workflows

# Recent failures only
ops workflows --failures
```

### Query Database

```bash
# Query any table
ops db:query tasks --limit=10

# Filter results
ops db:query integration_logs --filter=status=error

# Order results
ops db:query tasks --order=created_at --desc
```

### Test Integrations

```bash
# Test specific integration
ops test-integration hubspot
ops test-integration supabase
ops test-integration n8n
```

---

## 5️⃣ Automate Health Checks (5 minutes)

### Option A: Crontab

```bash
# Edit crontab
crontab -e

# Add this line (runs every 5 minutes)
*/5 * * * * cd /root/master-ops && npx tsx tools/health-checks/integration-health-check.ts >> /var/log/health-check.log 2>&1
```

### Option B: n8n Workflow

1. Create new workflow in n8n
2. Add **Cron** trigger (every 5 minutes)
3. Add **Execute Command** node:
   ```bash
   cd /root/master-ops && npx tsx tools/health-checks/integration-health-check.ts
   ```
4. Add **IF** node checking exit code
5. On failure, send alert via Slack/Email

---

## 6️⃣ Local Development (Optional)

### Start Docker Environment

```bash
# Copy environment file
cp .env.docker.example .env.docker

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Access Services

- **Supabase Studio**: http://localhost:54323
- **n8n**: http://localhost:5678
- **PostgreSQL**: localhost:54322

### Stop Services

```bash
docker-compose down
```

---

## 7️⃣ Using the Integration Layer

### HubSpot Example

```typescript
import { hubspotClient } from './shared/libs/integrations/hubspot/client'

// Get contact (with automatic retry, rate limiting, logging)
const contact = await hubspotClient.contacts.get('12345')

// List companies
const companies = await hubspotClient.companies.list({
  limit: 100,
  properties: ['name', 'domain']
})

// Create contact
const newContact = await hubspotClient.contacts.create({
  email: 'john@example.com',
  firstname: 'John',
  lastname: 'Doe'
})
```

### Custom Integration Example

```typescript
import { BaseConnector } from './shared/libs/integrations/base'

class MyServiceConnector extends BaseConnector {
  constructor() {
    super('my-service', {
      rateLimiter: { maxRequests: 100, windowMs: 60000 },
      retry: { maxRetries: 3 }
    })
  }

  async getData(id: string) {
    return this.execute('getData', async () => {
      // Your API call here
      const response = await fetch(`https://api.example.com/data/${id}`)
      return response.json()
    })
  }

  protected async performHealthCheck() {
    await fetch('https://api.example.com/health')
  }
}
```

---

## 8️⃣ Logging

### Manual Logging

```typescript
import { logger } from './shared/libs/logger'

// Basic logging
logger.info('Operation completed')
logger.error('Operation failed', { userId: '123' }, error)

// With context
logger.info('Order processed', {
  source: 'hubspot',
  operation: 'createOrder',
  businessId: 'teelixir',
  metadata: { orderId: '12345', amount: 150 }
})

// Performance tracking
await logger.perf('processOrder', async () => {
  // Your code here
  return processOrder()
}, { businessId: 'teelixir' })
```

---

## 9️⃣ Database Queries

### Via SQL

```sql
-- Recent errors
SELECT * FROM recent_errors LIMIT 20;

-- Integration health
SELECT * FROM integration_health_summary;

-- Business performance
SELECT * FROM business_performance_comparison;

-- Businesses needing attention
SELECT * FROM businesses_needing_attention;

-- Stale integrations
SELECT * FROM stale_integrations;

-- Get business stats
SELECT * FROM get_business_stats('teelixir', 48);
```

### Via CLI

```bash
# View recent errors
ops db:query recent_errors --limit=20

# View integration health
ops db:query integration_health_summary

# View business performance
ops db:query business_performance_comparison
```

---

## 🔟 Troubleshooting

### Health Check Fails

```bash
# Check environment variables
cat .env | grep SUPABASE
cat .env | grep HUBSPOT

# Test specific service
ops test-integration supabase
ops test-integration hubspot

# View recent errors
ops logs --errors-only -n 50
```

### CLI Not Working

```bash
# Ensure dependencies installed
npm install

# Run with full path
npx tsx /root/master-ops/tools/ops-cli/index.ts --help

# Check permissions
chmod +x tools/ops-cli/index.ts
```

### Docker Issues

```bash
# View logs
docker-compose logs

# Restart services
docker-compose down
docker-compose up -d

# Clean restart
docker-compose down -v
docker-compose up -d
```

### No Logs in Database

1. Verify schemas are deployed
2. Check `SUPABASE_SERVICE_ROLE_KEY` in `.env`
3. Test manual logging:
   ```typescript
   import { logger } from './shared/libs/logger'
   logger.info('Test log')
   ```

---

## 📚 Next Steps

1. ✅ Complete this quick start
2. 📖 Read [ENHANCEMENTS-SUMMARY.md](ENHANCEMENTS-SUMMARY.md) for full details
3. 📋 Review [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) for future enhancements
4. 🏗️ Read [ARCHITECTURE.md](ARCHITECTURE.md) for system understanding
5. ⚙️ Set up automated health checks (cron or n8n)
6. 🔍 Explore business views in Supabase
7. 🛠️ Build custom integrations using the framework

---

## 🆘 Need Help?

- **Scripts**: See [scripts/README.md](scripts/README.md)
- **CLI**: See [tools/README.md](tools/README.md)
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Full Summary**: See [ENHANCEMENTS-SUMMARY.md](ENHANCEMENTS-SUMMARY.md)

---

**Time to Complete**: ~20 minutes
**Status**: Ready for production use ✅
