# Backup and Restore Utilities

Utilities for backing up and restoring data from Supabase.

## Features

- **Full Backups**: Backup all data from specified tables
- **Incremental Backups**: Backup only data modified since a certain date
- **Selective Restore**: Restore specific tables
- **Dry Run Mode**: Preview restore operations without making changes
- **Batch Processing**: Efficient handling of large datasets
- **Backup Verification**: Validate backup integrity before restore

## Quick Start

### Create a Full Backup

```bash
# Backup all tables to ./backups directory
npx tsx tools/backup-restore/backup.ts

# Backup to custom directory
npx tsx tools/backup-restore/backup.ts --output /path/to/backups
```

### Create an Incremental Backup

```bash
# Backup data modified since yesterday
npx tsx tools/backup-restore/backup.ts --type incremental --since 2025-11-19

# Backup specific tables
npx tsx tools/backup-restore/backup.ts --tables businesses,integration_logs
```

### List Available Backups

```bash
npx tsx tools/backup-restore/backup.ts --list
```

### Restore from Backup

```bash
# Dry run (preview without making changes)
npx tsx tools/backup-restore/restore.ts --backup ./backups/backup-2025-11-20T10-00-00 --dry-run

# Restore all tables (insert only, skip existing)
npx tsx tools/backup-restore/restore.ts --backup ./backups/backup-2025-11-20T10-00-00

# Restore with overwrite (update existing records)
npx tsx tools/backup-restore/restore.ts --backup ./backups/backup-2025-11-20T10-00-00 --overwrite

# Restore specific tables
npx tsx tools/backup-restore/restore.ts --backup ./backups/backup-2025-11-20T10-00-00 --tables businesses
```

### Verify Backup Integrity

```bash
npx tsx tools/backup-restore/restore.ts --backup ./backups/backup-2025-11-20T10-00-00 --verify
```

## Backup Options

| Option | Description | Default |
|--------|-------------|---------|
| `--type <type>` | Backup type: `full` or `incremental` | `full` |
| `--output <path>` | Output directory for backups | `./backups` |
| `--tables <list>` | Comma-separated list of tables to backup | All tables |
| `--since <date>` | For incremental: backup data since this date | N/A |
| `--list` | List available backups | N/A |

## Restore Options

| Option | Description | Default |
|--------|-------------|---------|
| `--backup <path>` | Path to backup directory (required) | N/A |
| `--tables <list>` | Comma-separated list of tables to restore | All tables |
| `--dry-run` | Preview restore without making changes | `false` |
| `--overwrite` | Overwrite existing data (upsert) | `false` |
| `--batch-size <n>` | Number of rows to insert per batch | `100` |
| `--verify` | Verify backup integrity only | `false` |

## Backup Structure

Each backup creates a directory with the following structure:

```
backups/
└── backup-2025-11-20T10-00-00/
    ├── metadata.json           # Backup metadata
    ├── businesses.json         # Business data
    ├── integration_logs.json   # Integration logs
    ├── workflow_execution_logs.json
    └── api_metrics.json
```

### Metadata File

```json
{
  "timestamp": "2025-11-20T10:00:00.000Z",
  "type": "full",
  "tables": [
    {
      "name": "businesses",
      "rows": 4,
      "size": 2048,
      "file": "/path/to/businesses.json"
    }
  ],
  "totalRows": 1247,
  "totalSize": 524288
}
```

## Default Tables

The following tables are backed up by default:

- `businesses` - Business master data
- `integration_logs` - Integration operation logs
- `workflow_execution_logs` - Workflow execution logs
- `api_metrics` - API performance metrics

## Best Practices

### Daily Backups

Create a cron job for automated daily backups:

```bash
# Run at 2 AM daily
0 2 * * * cd /path/to/master-ops && npx tsx tools/backup-restore/backup.ts --output /var/backups/master-ops
```

### Incremental Backups

For large datasets, use incremental backups during the day:

```bash
# Backup changes from the last 24 hours
npx tsx tools/backup-restore/backup.ts --type incremental --since $(date -d '24 hours ago' --iso-8601)
```

### Backup Rotation

Keep backups for a specific period and delete old ones:

```bash
#!/bin/bash
# Delete backups older than 30 days
find /var/backups/master-ops -name "backup-*" -type d -mtime +30 -exec rm -rf {} \;
```

### Before Major Changes

Always create a backup before:
- Schema migrations
- Bulk data updates
- System upgrades
- Configuration changes

```bash
# Create a pre-migration backup
npx tsx tools/backup-restore/backup.ts --output ./backups/pre-migration
```

### Testing Restores

Regularly test your backups by restoring to a test environment:

```bash
# Dry run to verify
npx tsx tools/backup-restore/restore.ts --backup ./backups/latest --dry-run

# Restore to test database (update DATABASE_URL in .env.test first)
DATABASE_URL=$TEST_DATABASE_URL npx tsx tools/backup-restore/restore.ts --backup ./backups/latest
```

## Troubleshooting

### Backup is Slow

For large tables, consider:
- Backing up specific tables instead of all
- Using incremental backups
- Running backups during off-peak hours
- Increasing batch size for restore operations

### Restore Fails with Duplicate Key Errors

Use insert-only mode (default) which skips existing records:

```bash
npx tsx tools/backup-restore/restore.ts --backup ./backups/latest
```

Or use overwrite mode to update existing records:

```bash
npx tsx tools/backup-restore/restore.ts --backup ./backups/latest --overwrite
```

### Backup File Too Large

For very large datasets:
- Use incremental backups more frequently
- Implement compression (future enhancement)
- Archive old logs before backup
- Consider database-level backups for very large datasets

### Restore is Slow

Increase batch size for faster inserts:

```bash
npx tsx tools/backup-restore/restore.ts --backup ./backups/latest --batch-size 500
```

## Limitations

- Currently supports JSON format only (no compression)
- No built-in encryption (store backups in secure locations)
- No automatic cleanup of old backups (use cron for rotation)
- No cloud storage integration (future enhancement)

## Future Enhancements

- [ ] Compression support (gzip)
- [ ] Encryption at rest
- [ ] Cloud storage (S3, Google Cloud Storage)
- [ ] Parallel backup/restore
- [ ] Progress bars for large operations
- [ ] Email notifications on completion
- [ ] Automatic backup rotation
- [ ] Point-in-time recovery

## Examples

### Example 1: Daily Full Backup Script

```bash
#!/bin/bash
# daily-backup.sh

BACKUP_DIR="/var/backups/master-ops"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$BACKUP_DIR/backup-$DATE.log"

echo "Starting backup at $(date)" >> "$LOG_FILE"

npx tsx tools/backup-restore/backup.ts \
  --output "$BACKUP_DIR" \
  >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
  echo "Backup completed successfully at $(date)" >> "$LOG_FILE"
else
  echo "Backup failed at $(date)" >> "$LOG_FILE"
  # Send alert
  curl -X POST https://hooks.slack.com/... -d '{"text":"Backup failed!"}'
fi

# Delete backups older than 30 days
find "$BACKUP_DIR" -name "backup-*" -type d -mtime +30 -exec rm -rf {} \;
```

### Example 2: Restore After Data Corruption

```bash
# 1. Find the latest good backup
npx tsx tools/backup-restore/backup.ts --list

# 2. Verify backup integrity
npx tsx tools/backup-restore/restore.ts \
  --backup ./backups/backup-2025-11-20T10-00-00 \
  --verify

# 3. Dry run to see what will be restored
npx tsx tools/backup-restore/restore.ts \
  --backup ./backups/backup-2025-11-20T10-00-00 \
  --dry-run

# 4. Restore with overwrite
npx tsx tools/backup-restore/restore.ts \
  --backup ./backups/backup-2025-11-20T10-00-00 \
  --overwrite
```

### Example 3: Migrate Specific Business Data

```bash
# 1. Backup only business data
npx tsx tools/backup-restore/backup.ts \
  --tables businesses \
  --output ./migration

# 2. Restore to new environment
DATABASE_URL=$NEW_DATABASE_URL npx tsx tools/backup-restore/restore.ts \
  --backup ./migration/backup-* \
  --tables businesses
```

## Related Documentation

- [RUNBOOK.md](../../RUNBOOK.md) - Operations procedures
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture

---

**Last Updated**: 2025-11-20
