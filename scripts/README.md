# Scripts Directory

This directory contains all operational scripts organized by function.

## Directory Structure

### `/tests`
Testing scripts for individual services and integrations.

**Contents**:
- `test-hubspot.ts` - HubSpot connection and API tests
- `test-supabase.ts` - Supabase connection and query tests
- `test-n8n-connection.ts` - n8n connection validation
- `test-n8n-library.ts` - n8n library functionality tests
- `test-unleashed-auth.ts` - Unleashed authentication tests
- `test-unleashed-workflow.ts` - Unleashed workflow tests
- `test-fixed-auth.ts` - Fixed authentication implementation tests

**Usage**:
```bash
npx tsx scripts/tests/test-hubspot.ts
npx tsx scripts/tests/test-supabase.ts
```

---

### `/fixes`
One-off fix scripts for data corrections and system repairs.

**Contents**:
- `fix-all-properties.ts` - Bulk property corrections
- `fix-hubspot-unique-properties.ts` - HubSpot unique constraint fixes
- `fix-crypto-import.ts` - Crypto module import fixes
- `fix-crypto-restriction.ts` - Crypto restriction workarounds
- `fix-unleashed-signature.ts` - Unleashed signature generation fixes
- `fix-unleashed-workflow.ts` - Unleashed workflow corrections
- `fix-with-pure-js-hmac.ts` - Pure JavaScript HMAC implementation
- `apply-unleashed-fix.ts` - Apply Unleashed authentication fix
- `create-properties.ts` - Create missing HubSpot properties

**Usage**:
```bash
npx tsx scripts/fixes/fix-all-properties.ts
```

**Note**: Review fix scripts before running - they may modify production data.

---

### `/workflows`
n8n workflow management and validation scripts.

**Contents**:
- Workflow activation, analysis, and deployment scripts
- Workflow validation and testing tools
- Workflow monitoring and diagnostics

**Usage**:
```bash
npx tsx scripts/workflows/activate-unleashed-workflow.ts
npx tsx scripts/workflows/force-refresh-workflow.ts
```

---

### `/analysis`
Diagnostic and analysis scripts for troubleshooting.

**Contents**:
- System health checks
- Field and configuration verification
- Execution monitoring
- Data validation scripts

**Usage**:
```bash
npx tsx scripts/analysis/deep-execution-check.ts
npx tsx scripts/analysis/verify-property-constraints.ts
```

---

### `/integration-tests`
Integration testing framework and test suites.

**Contents**:
- `integration-test-framework.ts` - Core testing framework
- `example-integration-test.ts` - Example integration tests
- `run-integration-tests.ts` - Test suite runner
- `test-workflow-credentials.ts` - Credential validation tests

**Usage**:
```bash
npx tsx scripts/integration-tests/run-integration-tests.ts
```

---

### `/auth`
Authentication and OAuth implementation scripts.

**Contents**:
- `oauth-strategies.ts` - OAuth flow implementations
- `generate-auth-code.ts` - OAuth code generation
- `test-oauth.ts` - OAuth testing utilities

**Usage**:
```bash
npx tsx scripts/auth/generate-auth-code.ts
npx tsx scripts/auth/test-oauth.ts
```

---

### `/sync`
Data synchronization scripts between systems.

**Contents**:
- `sync-businesses-to-hubspot.ts` - Business data sync to HubSpot
- `sync-all-remaining.ts` - Sync remaining records
- `get-businesses.ts` - Fetch business data
- `get-hubspot-properties.ts` - Fetch HubSpot property schemas
- `find-teelixir-project.ts` - Locate specific projects
- `list-unique-company-properties.ts` - List unique company fields
- `sample-businesses.ts` - Sample business data
- `execute-and-monitor.ts` - Execute and monitor sync jobs

**Usage**:
```bash
npx tsx scripts/sync/sync-businesses-to-hubspot.ts
npx tsx scripts/sync/get-businesses.ts
```

---

## Running Scripts

All scripts can be run using `npx tsx`:

```bash
npx tsx scripts/<category>/<script-name>.ts
```

### Environment Variables

Most scripts require environment variables from `.env`:

```bash
SUPABASE_URL=your-url
SUPABASE_ANON_KEY=your-key
HUBSPOT_ACCESS_TOKEN=your-token
N8N_API_URL=your-n8n-url
N8N_API_KEY=your-key
```

### Common Patterns

**Test a connection**:
```bash
npx tsx scripts/tests/test-<service>.ts
```

**Run integration tests**:
```bash
npx tsx scripts/integration-tests/run-integration-tests.ts
```

**Sync data**:
```bash
npx tsx scripts/sync/sync-businesses-to-hubspot.ts
```

**Analyze system**:
```bash
npx tsx scripts/analysis/deep-execution-check.ts
```

---

## Development

### Adding New Scripts

1. Place script in appropriate category folder
2. Use descriptive, action-oriented names
3. Add documentation header to script
4. Update this README with script description
5. Test script before committing

### Script Template

```typescript
/**
 * Script Name
 *
 * Purpose: Brief description of what this script does
 * Usage: npx tsx scripts/<category>/<script-name>.ts
 *
 * Environment Variables Required:
 * - VAR_NAME: Description
 */

import { supabase } from '../infra/supabase/client'

async function main() {
  // Implementation
}

main().catch(console.error)
```

---

## Migration from Root

All scripts were previously in the root directory. They have been organized into categories for better maintainability.

**Previous location**: `/root/master-ops/*.ts`
**New location**: `/root/master-ops/scripts/<category>/*.ts`

---

**Last Updated**: 2025-11-20
