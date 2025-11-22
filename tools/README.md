# Tools Directory

Command-line tools and utilities for managing master-ops infrastructure and integrations.

## Available Tools

### ops-cli - Master Operations CLI

Main command-line interface for common operations.

**Installation:**
```bash
# Option 1: Run directly with npx
npx tsx tools/ops-cli/index.ts <command>

# Option 2: Create an alias (add to ~/.bashrc or ~/.zshrc)
alias ops='npx tsx /root/master-ops/tools/ops-cli/index.ts'

# Option 3: npm link (makes 'ops' available globally)
npm link
```

**Commands:**

```bash
# Health checks
ops health-check                           # Check all integrations
ops health-check --services=hubspot        # Check specific service
ops health-check -v                        # Verbose output

# Integration testing
ops test-integration hubspot               # Test HubSpot connection
ops test-integration supabase              # Test Supabase connection

# Logs
ops logs                                   # View recent logs
ops logs --source=hubspot                  # Filter by source
ops logs --errors-only                     # Show only errors
ops logs -n 100                            # Show last 100 logs

# Database queries
ops db:query tasks --limit=10              # Query tasks table
ops db:query integration_logs --filter=status=error

# Statistics
ops stats                                  # Show integration stats
ops stats --hours=48                       # Stats for last 48 hours

# Workflows
ops workflows                              # Show workflow performance
ops workflows --failures                   # Show recent failures

# Help
ops --help                                 # Show all commands
ops <command> --help                       # Show command help
```

---

### health-checks/integration-health-check.ts

Standalone health check script that can be run by cron or n8n workflows.

**Usage:**
```bash
npx tsx tools/health-checks/integration-health-check.ts
npx tsx tools/health-checks/integration-health-check.ts --verbose
npx tsx tools/health-checks/integration-health-check.ts --services=hubspot,supabase
```

**Scheduled Execution:**

Add to crontab to run every 5 minutes:
```bash
*/5 * * * * cd /root/master-ops && npx tsx tools/health-checks/integration-health-check.ts
```

Or create an n8n workflow with a cron trigger to run the health check.

**Exit Codes:**
- `0` - All services healthy
- `1` - One or more services unhealthy

---

## Environment Variables

All tools respect the following environment variables from `.env`:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# HubSpot
HUBSPOT_ACCESS_TOKEN=your-access-token

# n8n
N8N_BASE_URL=https://your-n8n-instance.com
N8N_API_KEY=your-api-key

# Logging
LOG_LEVEL=info  # debug, info, warn, error
```

---

## Examples

### Monitor System Health

```bash
# Quick health check
ops health

# Detailed health check with verbose output
ops health -v

# Check specific services
ops health --services=hubspot,supabase,n8n
```

### Debug Integration Issues

```bash
# View recent errors
ops logs --errors-only -n 50

# View logs for specific integration
ops logs --source=hubspot --level=error

# Test specific integration
ops test-integration hubspot
```

### Monitor Workflows

```bash
# View workflow statistics
ops workflows

# View recent failures
ops workflows --failures

# View detailed logs for a workflow
ops logs --source=workflow
```

### Query Data

```bash
# View recent tasks
ops db:query tasks --limit=20 --order=created_at --desc

# View pending tasks
ops db:query tasks --filter=status=pending

# View integration logs
ops db:query integration_logs --limit=100
```

---

## Development

### Adding New Commands

1. Edit `tools/ops-cli/index.ts`
2. Add new command using Commander.js pattern:

```typescript
program
  .command('my-command <arg>')
  .description('Description of command')
  .option('-o, --option <value>', 'Option description')
  .action(async (arg, options) => {
    // Implementation
  })
```

3. Test the command:
```bash
npx tsx tools/ops-cli/index.ts my-command test-arg --option=value
```

### Adding New Health Checks

1. Edit `tools/health-checks/integration-health-check.ts`
2. Add new check method:

```typescript
private async checkMyService(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  try {
    // Health check logic
    return {
      service: 'my-service',
      healthy: true,
      timestamp: new Date(),
      responseTime: Date.now() - startTime,
    }
  } catch (error) {
    return {
      service: 'my-service',
      healthy: false,
      timestamp: new Date(),
      error: (error as Error).message,
    }
  }
}
```

3. Add to service list in constructor

---

## Automation

### Cron Jobs

Example crontab entries:

```bash
# Health check every 5 minutes
*/5 * * * * cd /root/master-ops && npx tsx tools/health-checks/integration-health-check.ts >> /var/log/health-check.log 2>&1

# Daily statistics report at 9 AM
0 9 * * * cd /root/master-ops && npx tsx tools/ops-cli/index.ts stats --hours=24 | mail -s "Daily Integration Stats" admin@example.com
```

### n8n Workflows

Create workflows that trigger these tools:

1. **Scheduled Health Check**
   - Trigger: Cron (every 5 minutes)
   - Action: Execute Command `npx tsx tools/health-checks/integration-health-check.ts`
   - If failed: Send Slack notification

2. **Error Alert Workflow**
   - Trigger: Supabase webhook on new error logs
   - Action: Execute `ops logs --errors-only -n 10`
   - Send results to Slack channel

---

## Troubleshooting

### Permission Denied

```bash
chmod +x tools/ops-cli/index.ts
chmod +x tools/health-checks/integration-health-check.ts
```

### Module Not Found

```bash
npm install
```

### Supabase Connection Errors

Check `.env` file has correct credentials:
```bash
cat .env | grep SUPABASE
```

Test connection:
```bash
ops test-integration supabase
```

---

**Last Updated**: 2025-11-20
