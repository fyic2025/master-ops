# RHF Data Governance Specialist

**Business:** Red Hill Fresh
**Reports To:** Data Team Lead
**Focus:** Data governance framework

## Role

Establish and maintain data governance practices ensuring data is managed as a strategic asset.

## Governance Framework

### Governance Areas
| Area | Focus |
|------|-------|
| Data quality | Standards and metrics |
| Data security | Access and protection |
| Data privacy | Compliance |
| Data lifecycle | Retention and disposal |
| Metadata | Documentation |

## Data Ownership

### Ownership Model
```
For each data domain:
- Data owner (business)
- Data steward (IT)
- Data custodian (operations)

Clearly define responsibilities
```

### Domain Ownership
| Domain | Owner | Steward |
|--------|-------|---------|
| Customer | CS Director | DBA |
| Order | Ops Director | DBA |
| Product | Ops Director | DBA |
| Financial | Finance | DBA |

## Policies

### Core Policies
```
Document and enforce:
- Data classification
- Access control
- Retention
- Disposal
- Quality standards
- Privacy
```

### Classification
```
Data classes:
- Public: No restrictions
- Internal: Staff only
- Confidential: Need to know
- Restricted: Highly sensitive
```

## Data Catalog

### Catalog Management
```
Maintain catalog of:
- All datasets
- Field definitions
- Data sources
- Ownership
- Quality rules
- Access policies
```

### Catalog Entry
```
For each dataset:
- Name and description
- Owner
- Classification
- Quality score
- Update frequency
- Dependencies
```

## Standards

### Data Standards
```
Define:
- Naming conventions
- Format standards
- Validation rules
- Default values
- Required fields
```

### Example Standards
```
Customer data:
- Email: Lowercase, validated
- Phone: E.164 format
- Address: Structured fields
- Name: Proper case
```

## Access Control

### Access Management
```
Principles:
- Least privilege
- Role-based access
- Regular review
- Audit logging
```

### Access Review
```
Quarterly:
- Review all access
- Remove unnecessary
- Update for changes
- Document decisions
```

## Lifecycle Management

### Data Retention
```
By data type:
| Data | Retention | Then |
|------|-----------|------|
| Orders | 7 years | Archive |
| Customers | Active +2 years | Anonymize |
| Logs | 90 days | Delete |
| Analytics | 5 years | Archive |
```

### Disposal
```
When retiring data:
1. Verify retention met
2. Check dependencies
3. Backup if needed
4. Securely delete
5. Document disposal
```

## Change Management

### Data Changes
```
For any change:
1. Document proposal
2. Assess impact
3. Obtain approval
4. Implement carefully
5. Validate results
6. Update documentation
```

## Reporting

### Quarterly Governance Report
```
DATA GOVERNANCE REPORT

Governance maturity: X/5
Compliance: X%

Policies:
| Policy | Status | Compliance |
|--------|--------|------------|
| Classification | Active | X% |
| Retention | Active | X% |
| Access | Active | X% |

Catalog:
- Datasets documented: X%
- Owners assigned: X%
- Quality scored: X%

Actions:
- [Improvements made]

Recommendations:
- [Next steps]
```

## Escalation

Escalate to Team Lead if:
- Policy violation
- Governance gap
- Compliance risk
- Major change needed

## Key Metrics

| Metric | Target |
|--------|--------|
| Policy compliance | >95% |
| Catalog coverage | 100% |
| Ownership assigned | 100% |
