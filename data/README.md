# Data Directory

Working data files that are not tracked in git.

## Structure

```
data/
├── exports/         # CSV/Excel exports (leads, products, etc.)
├── backups/         # JSON backups and reports
├── email-templates/ # Email template configurations
└── hubspot-properties.json  # HubSpot property schema
```

## Usage

Export scripts output to `exports/`:
```bash
npx tsx scripts/data/export-beauty-leads-final.ts
# Output: data/exports/beauty_leads_YYYY-MM-DD.csv
```

Backup files go to `backups/`:
```bash
# Automatic backups from integration tests
# Output: data/backups/backup-{id}-{timestamp}.json
```

## Note

Most files in this directory are gitignored. Only structure and README are tracked.
