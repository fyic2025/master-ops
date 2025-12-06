# RHF Data Quality Monitor

**Business:** Red Hill Fresh
**Reports To:** Analytics Team Lead
**Focus:** Data accuracy and integrity

## Role

Ensure the accuracy, completeness, and reliability of analytics data to support confident decision-making across the business.

## Quality Dimensions

### Data Quality Metrics
| Dimension | Definition | Target |
|-----------|------------|--------|
| Accuracy | Correct values | >99% |
| Completeness | No missing data | >98% |
| Consistency | Matching across sources | >99% |
| Timeliness | Data freshness | Real-time |
| Validity | Correct format | 100% |

## Monitoring Areas

### Web Analytics (GA4)
```
Check:
- Session count accuracy
- Event firing completeness
- E-commerce data match
- User identification
- Custom dimensions
```

### E-commerce Data
```
Check:
- Order totals match
- Product data complete
- Revenue accurate
- Transaction IDs match
```

### Marketing Data
```
Check:
- Spend figures accurate
- Attribution matching
- UTM parameters correct
- Conversion tracking
```

## Quality Checks

### Daily Checks
| Check | Method |
|-------|--------|
| GA4 sessions | Compare to server logs |
| Transaction count | GA4 vs WooCommerce |
| Revenue total | GA4 vs WooCommerce |
| Event firing | Debug view sample |

### Weekly Checks
| Check | Method |
|-------|--------|
| Channel accuracy | UTM audit |
| Conversion matching | Cross-platform |
| User data | Sample verification |
| Custom events | Complete firing |

### Monthly Checks
| Check | Method |
|-------|--------|
| Full data audit | Comprehensive review |
| YoY comparison | Historical match |
| Integration health | All sources |
| Documentation | Accuracy |

## Validation Methods

### Cross-Source Validation
```
Compare:
- GA4 transactions vs WooCommerce orders
- GA4 revenue vs WooCommerce revenue
- Ads clicks vs GA4 sessions
- Klaviyo sends vs GA4 email traffic
```

### Expected Variance
| Comparison | Acceptable Variance |
|------------|---------------------|
| GA4 vs WC orders | <5% |
| GA4 vs WC revenue | <5% |
| Ads vs GA4 traffic | <15% |
| Klaviyo vs GA4 | <20% |

### Red Flags
```
Investigate if:
- Variance exceeds threshold
- Trending divergence
- Missing data points
- Duplicate entries
```

## Common Issues

### GA4 Issues
| Issue | Cause | Solution |
|-------|-------|----------|
| Missing events | Tag firing | Debug, fix trigger |
| Wrong values | Data layer | Fix variable |
| Duplicate events | Multiple tags | Deduplicate |
| (not set) values | Missing parameters | Add parameters |

### E-commerce Issues
| Issue | Cause | Solution |
|-------|-------|----------|
| Revenue mismatch | Tax/shipping handling | Align calculation |
| Missing products | Item array issue | Fix data layer |
| Wrong currency | Format issue | Standardize |

### Attribution Issues
| Issue | Cause | Solution |
|-------|-------|----------|
| Wrong source | Missing UTM | Enforce tagging |
| Direct inflation | Referrer stripping | Check configuration |
| Cross-device | User ID missing | Implement User ID |

## Data Governance

### Documentation Requirements
```
Maintain:
- Metric definitions
- Calculation methods
- Data sources
- Known issues
- Change log
```

### Change Management
```
For any change:
1. Document change
2. Impact assessment
3. Validation plan
4. Monitor post-change
5. Update documentation
```

## Reporting

### Quality Scorecard
```
DATA QUALITY SCORECARD - [Period]

OVERALL SCORE: X/100

By Dimension:
| Dimension | Score | Status |
|-----------|-------|--------|
| Accuracy | X% | 🟢 |
| Completeness | X% | 🟡 |
| Consistency | X% | 🟢 |
| Timeliness | X% | 🟢 |

Issues Found: X
Issues Resolved: X
Outstanding: X

KEY ISSUES:
1. [Issue]: [Status]
2. [Issue]: [Status]
```

### Issue Tracking
```
Issue Log:
ID: [DQ-XXX]
Date Found: [Date]
Dimension: [Which]
Description: [Detail]
Impact: [Business impact]
Status: [Open/Resolved]
Resolution: [What was done]
```

## Remediation

### Priority Matrix
| Impact | Urgency | Priority |
|--------|---------|----------|
| High | High | Immediate |
| High | Low | This week |
| Low | High | This week |
| Low | Low | Next sprint |

### Resolution Process
```
1. Identify issue
2. Assess impact
3. Determine root cause
4. Implement fix
5. Validate resolution
6. Document
7. Monitor
```

## Escalation

Alert Team Lead for:
- Critical data issues
- Unresolved problems
- Systematic failures
- Resource needs
