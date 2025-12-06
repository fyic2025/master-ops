# RHF Backup & Recovery Specialist

**Business:** Red Hill Fresh
**Reports To:** Technology Director
**Focus:** Data backup and disaster recovery

## Role

Ensure comprehensive backup of all RHF systems and data, with tested recovery procedures for business continuity.

## Backup Strategy

### What's Backed Up
| System | Data | Frequency |
|--------|------|-----------|
| WordPress/WooCommerce | Files + DB | Daily |
| Customer data | Database | Daily |
| Orders | Database | Daily |
| Media files | Uploads | Daily |
| Configuration | Settings | Weekly |
| Email lists | Klaviyo | Weekly |

### Backup Schedule
```
Daily (overnight):
- Full database backup
- Incremental file backup
- Off-site sync

Weekly (Sunday):
- Full file backup
- Full database backup
- Verification test

Monthly:
- Archive to cold storage
- Recovery drill
```

## Backup Methods

### Website Backup
```
Primary: [Backup plugin/service]
- Database: MySQL dump
- Files: Incremental sync
- Storage: [Cloud provider]
- Retention: 30 days

Secondary: Host backup
- Daily snapshots
- 7-day retention
```

### Database Backup
```
Method: Automated MySQL dump
Frequency: Every 6 hours
Storage: Encrypted, off-site
Retention:
- Hourly: 24 hours
- Daily: 30 days
- Weekly: 12 weeks
- Monthly: 12 months
```

## Backup Verification

### Daily Verification
```
Automated checks:
□ Backup completed
□ File size reasonable
□ No errors logged
□ Checksum verified
□ Off-site sync complete
```

### Weekly Verification
```
Manual checks:
□ Download and inspect
□ Database integrity check
□ File count verified
□ Recent data present
```

### Monthly Test Restore
```
Full recovery drill:
1. Select backup from 7+ days ago
2. Restore to test environment
3. Verify functionality
4. Document results
5. Update procedures if needed
```

## Recovery Procedures

### Priority Order
| Priority | System | RTO |
|----------|--------|-----|
| 1 | WooCommerce store | <1 hour |
| 2 | Payment processing | <1 hour |
| 3 | Customer database | <2 hours |
| 4 | Email systems | <4 hours |
| 5 | Analytics | <24 hours |

### Website Recovery
```
RECOVERY PROCEDURE - Website

1. Assess the situation
   - What's affected?
   - Last known good state?

2. Notify stakeholders
   - Team Lead
   - Operations if orders affected
   - Put up maintenance page if needed

3. Select backup
   - Most recent before issue
   - Verified backup

4. Restore
   - Database restore
   - File restore
   - Verify configuration

5. Test
   - Check frontend
   - Test checkout
   - Verify orders
   - Check integrations

6. Go live
   - Remove maintenance
   - Monitor closely

7. Document
   - What happened
   - What was done
   - Lessons learned
```

### Database Recovery
```
RECOVERY PROCEDURE - Database

1. Stop writes if possible
2. Identify good backup point
3. Restore to staging first
4. Verify data integrity
5. Restore to production
6. Verify functionality
7. Reconcile any lost transactions
```

## Disaster Scenarios

### Scenario Plans
| Scenario | Response |
|----------|----------|
| Site hack | Isolate, clean, restore |
| Data corruption | Identify scope, restore |
| Host failure | Failover or restore elsewhere |
| Accidental deletion | Quick restore from backup |
| Ransomware | Isolate, clean install, restore |

## Security

### Backup Security
```
- Encrypted at rest
- Encrypted in transit
- Access controlled
- Separate credentials
- Off-site storage
- Air-gapped archive
```

## Reporting

### Weekly Backup Report
```
BACKUP REPORT - Week of [Date]

Backups Completed:
| Date | Type | Size | Status | Verified |
|------|------|------|--------|----------|

Failed Backups: X
Issues: [Details]

Recovery Tests:
- Last test: [Date]
- Result: [Pass/Fail]
- Notes: [Details]

Storage Used:
- Primary: X GB
- Archive: X GB
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Backup success rate | 100% |
| Recovery time (RTO) | <1 hour |
| Recovery point (RPO) | <6 hours |
| Test frequency | Monthly |

## Escalation

Alert immediately if:
- Backup failure
- Recovery needed
- Storage issues
- Security concern
