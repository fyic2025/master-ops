# Red Hill Fresh

Red Hill Fresh is a fresh produce delivery business.

## Project Structure

```
red-hill-fresh/
├── scripts/           # Red Hill Fresh-specific automation scripts
├── supabase/          # Database schemas and migrations
│   └── migrations/    # SQL migration files
├── n8n-workflows/     # Workflow JSON exports
└── docs/              # Project-specific documentation
```

## Services

| Service | Status | Notes |
|---------|--------|-------|
| BigCommerce | Configured | Fresh produce ecommerce |
| Supabase | Configured | Shared database instance |
| WordPress | Active | redhillfresh.com.au |

## Credentials

All credentials are stored in `MASTER-CREDENTIALS-COMPLETE.env`:

- `RHF_BC_STORE_HASH`
- `RHF_BC_ACCESS_TOKEN`
- `RHF_BC_CLIENT_ID`
- `RHF_SUPABASE_URL`
- `RHF_SUPABASE_SERVICE_ROLE_KEY`

## Quick Start

```bash
# Load credentials
export $(grep -v '^#' ../MASTER-CREDENTIALS-COMPLETE.env | xargs)

# Run Red Hill Fresh-specific scripts
npx tsx scripts/sync-products.ts
```

## Related Documentation

- [Main Architecture](../ARCHITECTURE.md)
- [Credentials Setup](../CREDENTIALS-SETUP-GUIDE.md)
- [Supabase Expert Guide](../.claude/skills/supabase-expert/README.md)
