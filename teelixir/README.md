# Teelixir

Teelixir is an Australian medicinal mushroom and adaptogen brand.

## Project Structure

```
teelixir/
├── scripts/           # Teelixir-specific automation scripts
├── supabase/          # Database schemas and migrations
│   └── migrations/    # SQL migration files
├── n8n-workflows/     # Workflow JSON exports
└── docs/              # Project-specific documentation
```

## Services

| Service | Status | Notes |
|---------|--------|-------|
| BigCommerce | Configured | Store: teelixir-au.myshopify.com |
| Supabase | Configured | Shared database instance |
| Xero | Configured | Financial integration |

## Credentials

All credentials are stored in `MASTER-CREDENTIALS-COMPLETE.env`:

- `TEELIXIR_BC_STORE_HASH`
- `TEELIXIR_BC_ACCESS_TOKEN`
- `TEELIXIR_BC_CLIENT_ID`
- `TEELIXIR_SUPABASE_URL`
- `TEELIXIR_SUPABASE_SERVICE_ROLE_KEY`

## Quick Start

```bash
# Load credentials
export $(grep -v '^#' ../MASTER-CREDENTIALS-COMPLETE.env | xargs)

# Run Teelixir-specific scripts
npx tsx scripts/sync-products.ts
```

## Related Documentation

- [Main Architecture](../ARCHITECTURE.md)
- [Credentials Setup](../CREDENTIALS-SETUP-GUIDE.md)
- [Supabase Expert Guide](../.claude/skills/supabase-expert/README.md)
