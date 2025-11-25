# Scripts Directory

This directory contains all operational scripts organized by function.

## Directory Structure

```
scripts/
├── analysis/        # Diagnostic, analysis, and exploration scripts
├── auth/            # OAuth and authentication scripts
├── checks/          # Validation, verification, and health check scripts
├── data/            # Data export, import, sync, and query scripts
├── financials/      # Xero and financial integration scripts
├── fixes/           # One-off fix and repair scripts
├── hubspot/         # HubSpot-specific operations
├── integration/     # Integration tests and frameworks
├── integration-tests/ # Legacy integration tests
├── misc/            # Miscellaneous utilities
├── setup/           # Setup and configuration scripts
├── sync/            # Legacy sync scripts
├── tests/           # Service connection tests
└── workflows/       # n8n workflow management
```

---

## `/checks` - Validation & Verification (27 scripts)

Scripts for validating configurations, verifying data integrity, and health checks.

```bash
npx tsx scripts/checks/verify-credentials.ts      # Verify all credentials
npx tsx scripts/checks/check-all-businesses.ts    # Check all business configs
npx tsx scripts/checks/validate-workflow.ts       # Validate n8n workflows
```

---

## `/tests` - Service Connection Tests (15 scripts)

Test scripts for individual service connections and APIs.

```bash
npx tsx scripts/tests/test-hubspot.ts        # Test HubSpot connection
npx tsx scripts/tests/test-supabase.ts       # Test Supabase connection
npx tsx scripts/tests/test-n8n-connection.ts # Test n8n connection
npx tsx scripts/tests/test-smartlead.ts      # Test SmartLead API
```

---

## `/analysis` - Diagnostics & Analysis

Scripts for exploring data, diagnosing issues, and analyzing systems.

```bash
npx tsx scripts/analysis/analyze-workflow.ts      # Analyze n8n workflows
npx tsx scripts/analysis/diagnose-workflow-errors.ts # Debug workflow issues
npx tsx scripts/analysis/explore-newsync6.ts      # Explore RDS databases
```

---

## `/data` - Data Operations (19 scripts)

Export, import, sync, and query scripts for data management.

```bash
npx tsx scripts/data/export-beauty-leads-final.ts  # Export leads to CSV
npx tsx scripts/data/sync-businesses-to-hubspot.ts # Sync to HubSpot
npx tsx scripts/data/import-teelixir-products.ts   # Import products
```

---

## `/setup` - Configuration & Setup

Scripts for setting up services and creating resources.

```bash
npx tsx scripts/setup/setup-n8n-credentials.ts    # Configure n8n credentials
npx tsx scripts/setup/create-supabase-credential.ts # Create Supabase creds
npx tsx scripts/setup/setup-multi-business.ts     # Multi-business setup
```

---

## `/fixes` - One-Off Fixes

Scripts for fixing specific issues or applying patches.

```bash
npx tsx scripts/fixes/fix-all-properties.ts       # Fix HubSpot properties
npx tsx scripts/fixes/fix-unleashed-workflow.ts   # Fix Unleashed auth
```

**Note**: Review fix scripts before running - they may modify production data.

---

## `/workflows` - n8n Workflow Management

Scripts for managing n8n workflows.

```bash
npx tsx scripts/workflows/activate-n8n-workflow.ts  # Activate workflow
npx tsx scripts/workflows/force-refresh-workflow.ts # Force refresh
npx tsx scripts/workflows/list-n8n-workflows.ts     # List all workflows
```

---

## `/financials` - Xero & Financial Scripts

Xero OAuth, chart of accounts, and financial reporting scripts.

```bash
npx tsx scripts/financials/setup-xero-auth-direct.ts  # Xero OAuth setup
npx tsx scripts/financials/analyze-chart-of-accounts.ts # Analyze COA
```

---

## `/hubspot` - HubSpot Operations

HubSpot-specific scripts for properties and sync.

```bash
npx tsx scripts/hubspot/get-hubspot-properties.ts   # Get property schema
npx tsx scripts/hubspot/deploy-hubspot-sync.ts      # Deploy sync workflow
```

---

## `/integration` - Integration Framework

Integration testing frameworks and OAuth implementations.

```bash
npx tsx scripts/integration/run-integration-tests.ts  # Run all tests
npx tsx scripts/integration/oauth-strategies.ts       # OAuth flows
```

---

## Running Scripts

All scripts can be run using `npx tsx`:

```bash
npx tsx scripts/<category>/<script-name>.ts
```

### Environment Variables

Most scripts require credentials from `MASTER-CREDENTIALS-COMPLETE.env`:

```bash
# Load credentials first
export $(grep -v '^#' MASTER-CREDENTIALS-COMPLETE.env | xargs)

# Then run scripts
npx tsx scripts/checks/verify-credentials.ts
```

---

## Development

### Adding New Scripts

1. Place script in appropriate category folder
2. Use descriptive, action-oriented names (verb-noun pattern)
3. Add documentation header to script
4. Test script before committing

### Naming Conventions

| Prefix | Purpose | Example |
|--------|---------|---------|
| `check-` | Validate/verify something | `check-credentials.ts` |
| `test-` | Test a service connection | `test-hubspot.ts` |
| `verify-` | Verify data integrity | `verify-multi-business.ts` |
| `export-` | Export data | `export-leads.ts` |
| `import-` | Import data | `import-products.ts` |
| `sync-` | Sync between systems | `sync-to-hubspot.ts` |
| `setup-` | Initial setup | `setup-n8n.ts` |
| `fix-` | One-off fix | `fix-properties.ts` |
| `analyze-` | Analysis/exploration | `analyze-workflow.ts` |

---

**Last Updated**: 2025-11-25
