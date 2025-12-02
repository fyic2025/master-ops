# Buy Organics Online - DIY Backup System

**Replaces:** Rewind/BackHub (~$50-100/month)
**New Cost:** ~$5/month (Digital Ocean Spaces)
**Savings:** ~$45-95/month ($540-1,140/year)

---

## Overview

This backup system replaces third-party BigCommerce backup apps with a self-hosted solution using:

- **n8n** - Workflow automation for scheduled backups
- **Digital Ocean Spaces** - S3-compatible object storage
- **Supabase** - Backup metadata and tracking
- **BigCommerce API** - Data extraction

---

## What Gets Backed Up

| Data Type | Frequency | Source | Priority |
|-----------|-----------|--------|----------|
| Products (full catalog) | Weekly | BigCommerce API | Critical |
| Product Variants | Weekly | BigCommerce API | Critical |
| Categories | Weekly | BigCommerce API | High |
| Brands | Weekly | BigCommerce API | High |
| Customers | Daily | BigCommerce API | Critical |
| Orders | Daily (incremental) | BigCommerce API | Critical |
| Store Settings | Monthly | BigCommerce API | Medium |
| Redirects (301s) | Monthly | BigCommerce API | Medium |
| Coupons/Promotions | Weekly | BigCommerce API | Medium |
| Theme Files | On change | Git repo | Critical |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BACKUP SYSTEM                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌───────────────────┐     │
│  │ n8n      │───▶│BigCommerce│───▶│ Digital Ocean    │     │
│  │ Workflow │    │ API       │    │ Spaces (S3)      │     │
│  └──────────┘    └──────────┘    └───────────────────┘     │
│       │                                    │                 │
│       │         ┌──────────┐              │                 │
│       └────────▶│ Supabase │◀─────────────┘                 │
│                 │ (tracking)│                                │
│                 └──────────┘                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Setup Instructions

### 1. Digital Ocean Spaces Setup

1. **Create a Space:**
   - Go to Digital Ocean → Spaces
   - Create new Space: `boo-backups`
   - Region: `syd1` (Sydney)
   - File Listing: Restricted

2. **Generate Access Keys:**
   - Go to API → Spaces Keys
   - Generate new key
   - Save Access Key and Secret Key

3. **Add to Vault:**
   ```bash
   # Add credentials to Supabase vault
   node shared/libs/vault-helper.js set boo do_spaces_key "YOUR_ACCESS_KEY"
   node shared/libs/vault-helper.js set boo do_spaces_secret "YOUR_SECRET_KEY"
   node shared/libs/vault-helper.js set boo do_spaces_bucket "boo-backups"
   node shared/libs/vault-helper.js set boo do_spaces_region "syd1"
   ```

### 2. Apply Supabase Schema

```bash
# Apply the backup tracking schema
node infra/supabase/apply-schema.js infra/supabase/schema-backup-system.sql
```

### 3. Import n8n Workflow

1. Open n8n dashboard
2. Go to Workflows → Import
3. Import: `buy-organics-online/n8n-workflows/02-store-backup.json`
4. Configure credentials:
   - BigCommerce API credentials
   - Digital Ocean Spaces credentials
   - Supabase credentials
5. Activate workflow

### 4. Verify Setup

```bash
# Run manual backup test
node buy-organics-online/scripts/backup-store.js --test

# Check backup status
node buy-organics-online/scripts/backup-store.js --status
```

---

## Backup Schedule

| Backup Type | Schedule | Retention |
|-------------|----------|-----------|
| Daily (incremental) | 2:00 AM AEST | 30 days |
| Weekly (full) | Sunday 3:00 AM AEST | 12 weeks |
| Monthly (archive) | 1st of month 4:00 AM | 12 months |

---

## Storage Structure

```
boo-backups/
├── daily/
│   ├── 2025-12-01/
│   │   ├── orders_incremental.json.gz
│   │   ├── customers_incremental.json.gz
│   │   └── manifest.json
│   └── ...
├── weekly/
│   ├── 2025-W48/
│   │   ├── products_full.json.gz
│   │   ├── variants_full.json.gz
│   │   ├── categories_full.json.gz
│   │   ├── brands_full.json.gz
│   │   ├── customers_full.json.gz
│   │   ├── orders_full.json.gz
│   │   ├── coupons_full.json.gz
│   │   └── manifest.json
│   └── ...
├── monthly/
│   ├── 2025-12/
│   │   ├── full_export.json.gz
│   │   ├── store_settings.json.gz
│   │   ├── redirects.json.gz
│   │   └── manifest.json
│   └── ...
└── latest/
    ├── products.json.gz
    ├── customers.json.gz
    └── manifest.json
```

---

## Manifest File Format

Each backup includes a manifest.json:

```json
{
  "backup_id": "boo-weekly-2025-W48",
  "backup_type": "weekly",
  "created_at": "2025-12-01T03:00:00Z",
  "store_hash": "hhhi",
  "files": [
    {
      "name": "products_full.json.gz",
      "records": 11357,
      "size_bytes": 2456789,
      "checksum": "sha256:abc123..."
    },
    {
      "name": "customers_full.json.gz",
      "records": 45230,
      "size_bytes": 1234567,
      "checksum": "sha256:def456..."
    }
  ],
  "total_records": 156587,
  "total_size_bytes": 12345678,
  "duration_seconds": 342,
  "status": "completed"
}
```

---

## Restore Procedures

### Restore Full Store

```bash
# List available backups
node buy-organics-online/scripts/restore-store.js --list

# Restore from specific backup
node buy-organics-online/scripts/restore-store.js --backup-id boo-weekly-2025-W48

# Restore specific data type only
node buy-organics-online/scripts/restore-store.js --backup-id boo-weekly-2025-W48 --type products
```

### Restore Single Product

```bash
# Find product in backup
node buy-organics-online/scripts/restore-store.js --find-product --sku "OB - 12345"

# Restore single product
node buy-organics-online/scripts/restore-store.js --restore-product --sku "OB - 12345" --backup-id boo-weekly-2025-W48
```

### Restore Customer Data

```bash
# Restore customer by email
node buy-organics-online/scripts/restore-store.js --restore-customer --email "customer@example.com"
```

---

## Monitoring & Alerts

### Dashboard Integration

Backup status is displayed on ops.growthcohq.com:
- Last backup time
- Backup size trends
- Success/failure status
- Storage usage

### Alert Conditions

| Condition | Alert Level | Action |
|-----------|-------------|--------|
| Backup failed | Critical | Email + Slack |
| Backup >2 hours | Warning | Slack |
| Storage >80% | Warning | Email |
| No backup in 48h | Critical | Email + Slack |

### Check Backup Health

```bash
# View backup status
node buy-organics-online/scripts/backup-store.js --status

# Output:
# Last Daily Backup: 2025-12-01 02:00 AEST (SUCCESS)
# Last Weekly Backup: 2025-11-24 03:00 AEST (SUCCESS)
# Storage Used: 2.3 GB / 250 GB (0.9%)
# Next Scheduled: Daily at 2025-12-02 02:00 AEST
```

---

## Cost Breakdown

### Digital Ocean Spaces

| Resource | Amount | Cost |
|----------|--------|------|
| Storage | 250 GB included | $5/month |
| Transfer | 1 TB outbound | Included |
| Extra storage | $0.02/GB | If needed |

### Estimated Storage Requirements

| Data Type | Records | Compressed Size |
|-----------|---------|-----------------|
| Products | 11,357 | ~2 MB |
| Customers | 45,000 | ~3 MB |
| Orders | 157,000 | ~15 MB |
| Categories | 500 | ~50 KB |
| Brands | 200 | ~20 KB |
| **Weekly Total** | | ~20 MB |

With 12 weekly + 30 daily + 12 monthly retention:
- **Estimated annual storage:** ~5 GB
- **Well within 250 GB included**

---

## Comparison with Third-Party Apps

| Feature | Rewind ($99/mo) | BackHub ($49/mo) | DIY Solution |
|---------|-----------------|------------------|--------------|
| Auto backups | Yes | Yes | Yes |
| Full store export | Yes | Yes | Yes |
| Point-in-time restore | Yes | Limited | Yes |
| Single item restore | Yes | No | Yes |
| Storage included | 365 days | 90 days | 12 months |
| Custom schedule | Limited | No | Yes |
| API access | No | No | Yes |
| **Monthly cost** | $99 | $49 | ~$5 |

---

## Troubleshooting

### Backup Failed

1. Check BigCommerce API credentials:
   ```bash
   node buy-organics-online/scripts/backup-store.js --test-api
   ```

2. Check Digital Ocean Spaces connectivity:
   ```bash
   node buy-organics-online/scripts/backup-store.js --test-storage
   ```

3. Check n8n workflow logs:
   - n8n Dashboard → Executions → Filter by "Store Backup"

### Restore Failed

1. Verify backup exists:
   ```bash
   node buy-organics-online/scripts/restore-store.js --verify --backup-id <id>
   ```

2. Check file integrity:
   ```bash
   node buy-organics-online/scripts/restore-store.js --checksum --backup-id <id>
   ```

### Storage Issues

1. Check current usage:
   ```bash
   node buy-organics-online/scripts/backup-store.js --storage-stats
   ```

2. Manual cleanup old backups:
   ```bash
   node buy-organics-online/scripts/backup-store.js --cleanup --older-than 90d
   ```

---

## Security Considerations

1. **Encryption at Rest:** DO Spaces encrypts all data at rest
2. **Encryption in Transit:** All transfers use HTTPS/TLS
3. **Access Control:** Spaces keys restricted to backup operations only
4. **Audit Trail:** All backup/restore operations logged to Supabase
5. **Data Retention:** Compliant with data retention policies

---

## Files Reference

| File | Purpose |
|------|---------|
| `BACKUP-SYSTEM.md` | This documentation |
| `n8n-workflows/02-store-backup.json` | n8n backup workflow |
| `scripts/backup-store.js` | CLI backup tool |
| `scripts/restore-store.js` | CLI restore tool |
| `infra/supabase/schema-backup-system.sql` | Database schema |

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-01 | Initial implementation - replaces Rewind/BackHub |

---

**Status:** Ready for Implementation
**Author:** Claude Code
**Last Updated:** 2025-12-01
