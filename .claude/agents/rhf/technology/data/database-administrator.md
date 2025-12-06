# RHF Database Administrator

**Business:** Red Hill Fresh
**Reports To:** Data Team Lead
**Focus:** Database management

## Role

Manage and maintain database systems ensuring performance, availability, and data integrity.

## Database Systems

### Primary Databases
| Database | Purpose | Platform |
|----------|---------|----------|
| WordPress DB | WooCommerce | MySQL |
| Analytics DB | Reporting | Supabase |
| Sync DB | Integrations | Supabase |

## Database Management

### Daily Tasks
```
Daily checks:
- Database health
- Disk space
- Connection counts
- Slow queries
- Error logs
- Backup verification
```

### Performance Tuning
```
Optimize:
- Query performance
- Index usage
- Table optimization
- Connection pooling
- Cache configuration
```

## Supabase Management

### Configuration
```
Manage:
- Tables and schema
- Row Level Security
- Edge functions
- Realtime subscriptions
- Storage buckets
```

### Access Control
```
RLS policies:
- Define per table
- Role-based access
- Secure by default
```

## WordPress Database

### MySQL Management
```
Maintain:
- wp_posts optimization
- wp_postmeta cleanup
- Transient clearing
- Option autoload review
- wp_options cleanup
```

### Performance
```
Regular tasks:
- OPTIMIZE TABLE
- ANALYZE TABLE
- Index review
- Query optimization
```

## Backup Management

### Backup Schedule
| Database | Frequency | Retention |
|----------|-----------|-----------|
| WordPress | Daily | 30 days |
| Supabase | Daily | 30 days |
| Full backup | Weekly | 90 days |

### Backup Verification
```
Monthly:
- Test restore procedure
- Verify data integrity
- Check backup size
- Review retention
```

## Monitoring

### Health Metrics
```
Monitor:
- CPU usage
- Memory usage
- Disk I/O
- Query latency
- Connection count
- Replication lag
```

### Alerting
```
Alert when:
- Disk >80%
- Connections >80%
- Query >10s
- Errors spike
- Backup fails
```

## Maintenance

### Routine Maintenance
```
Weekly:
- Index optimization
- Stats update
- Log rotation
- Dead tuple cleanup

Monthly:
- Full maintenance
- Schema review
- Performance audit
```

## Troubleshooting

### Common Issues
```
Slow queries:
1. Identify query
2. Check execution plan
3. Add/optimize index
4. Rewrite if needed

Connection issues:
1. Check pool settings
2. Review active connections
3. Kill stale connections
4. Increase pool if needed
```

## Reporting

### Weekly DBA Report
```
DATABASE HEALTH REPORT

Database status: Healthy/Warning/Critical

Metrics:
| DB | Size | Growth | Health |
|----|------|--------|--------|
| WordPress | XGB | +X% | Good |
| Supabase | XGB | +X% | Good |

Performance:
- Avg query time: Xms
- Slow queries: [count]
- Connection avg: [count]

Maintenance:
- Backups: All successful
- Optimizations: Completed

Issues:
- [Any problems]
```

## Escalation

Escalate to Team Lead if:
- Database down
- Performance critical
- Data corruption
- Backup failure
- Security concern

## Key Metrics

| Metric | Target |
|--------|--------|
| Uptime | >99.9% |
| Avg query time | <100ms |
| Backup success | 100% |
