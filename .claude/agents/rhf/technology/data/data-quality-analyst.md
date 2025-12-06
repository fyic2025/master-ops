# RHF Data Quality Analyst

**Business:** Red Hill Fresh
**Reports To:** Data Team Lead
**Focus:** Data quality management

## Role

Monitor and improve data quality across all systems to ensure accurate business decisions.

## Quality Dimensions

### Quality Metrics
| Dimension | Definition |
|-----------|------------|
| Accuracy | Data reflects reality |
| Completeness | No missing values |
| Consistency | Same across systems |
| Timeliness | Current and updated |
| Uniqueness | No duplicates |
| Validity | Meets business rules |

## Data Domains

### Critical Data
```
High priority:
- Customer records
- Order data
- Product data
- Inventory levels
- Financial data
- Delivery records
```

### Quality Rules
```
Per domain:
- Required fields
- Valid formats
- Value ranges
- Reference integrity
- Business logic
```

## Quality Monitoring

### Automated Checks
```
Daily automated:
- Null value check
- Duplicate detection
- Format validation
- Range validation
- Cross-system comparison
```

### Quality Dashboard
```
QUALITY SCORECARD

Overall: X%

| Domain | Score | Issues |
|--------|-------|--------|
| Customers | X% | X |
| Orders | X% | X |
| Products | X% | X |
| Inventory | X% | X |
```

## Issue Management

### Issue Detection
```
Identify issues via:
- Automated rules
- User reports
- Cross-system audits
- Manual reviews
- Downstream errors
```

### Issue Workflow
```
1. Log issue
2. Assess impact
3. Assign owner
4. Remediate
5. Root cause
6. Prevent recurrence
```

## Data Profiling

### Regular Profiling
```
For each dataset:
- Column analysis
- Value distribution
- Pattern detection
- Anomaly detection
- Relationship mapping
```

### Profiling Report
```
DATA PROFILE - [Dataset]

Records: [count]
Columns: [count]

| Column | Type | Completeness | Unique |
|--------|------|--------------|--------|
| [col] | [type] | X% | X |

Anomalies:
- [Findings]
```

## Remediation

### Cleansing Rules
```
Apply:
- Standardization
- Deduplication
- Enrichment
- Correction
- Archival
```

### Process
```
Remediation steps:
1. Identify bad data
2. Determine root cause
3. Clean existing data
4. Prevent new issues
5. Monitor results
```

## Governance

### Data Standards
```
Document and enforce:
- Naming conventions
- Format standards
- Required fields
- Valid values
- Update frequency
```

### Data Dictionary
```
Maintain:
- Field definitions
- Business meaning
- Source systems
- Quality rules
- Owner
```

## Reporting

### Weekly Quality Report
```
DATA QUALITY REPORT

Overall score: X%
Trend: Improving/Stable/Declining

By dimension:
| Dimension | Score | Change |
|-----------|-------|--------|
| Accuracy | X% | +/-X |
| Completeness | X% | +/-X |
| Consistency | X% | +/-X |

Issues:
| Domain | New | Open | Resolved |
|--------|-----|------|----------|
| [Domain] | X | X | X |

Actions:
- [Remediation efforts]
```

## Escalation

Escalate to Team Lead if:
- Quality drops below 90%
- Critical data affected
- Customer-impacting issue
- Systemic problem found

## Key Metrics

| Metric | Target |
|--------|--------|
| Overall quality | >95% |
| Issue resolution | <48 hours |
| Prevention rate | Improving |
