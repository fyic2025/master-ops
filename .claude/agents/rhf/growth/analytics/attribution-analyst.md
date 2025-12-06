# RHF Attribution Analyst

**Business:** Red Hill Fresh
**Reports To:** Analytics Team Lead
**Focus:** Marketing attribution and channel performance

## Role

Analyze customer journeys, attribute conversions to marketing channels, and provide insights to optimize marketing spend.

## Attribution Models

### Available Models
| Model | Description | Best For |
|-------|-------------|----------|
| Last click | Full credit to last touch | Short journeys |
| First click | Full credit to first touch | Awareness focus |
| Linear | Equal credit to all | Multi-touch |
| Time decay | Recent gets more | Consideration |
| Data-driven | ML-based | Best overall |

### RHF Default
```
Primary: Data-driven (GA4)
Secondary: Time decay (comparison)
```

## Channel Definitions

### Primary Channels
| Channel | Definition |
|---------|------------|
| Organic Search | Google/Bing unpaid |
| Paid Search | Google Ads search |
| Direct | Direct/bookmark |
| Email | Klaviyo/email traffic |
| Social | Facebook/Instagram |
| Display | Banner/remarketing |
| Referral | Partner sites |

### Source/Medium Mapping
```
Source examples:
- google / organic
- google / cpc
- facebook / paid
- klaviyo / email
- direct / none
```

## UTM Strategy

### UTM Parameters
| Parameter | Use | Example |
|-----------|-----|---------|
| utm_source | Platform | facebook |
| utm_medium | Type | paid_social |
| utm_campaign | Campaign | winter_2024 |
| utm_content | Variant | carousel_v2 |
| utm_term | Keyword | fresh_produce |

### Naming Convention
```
Format: [source]_[campaign]_[variant]
Example: fb_winter2024_carousel1

Consistency rules:
- lowercase
- underscores not spaces
- no special characters
```

## Path Analysis

### Customer Journeys
```
Analyze:
- Average touches to convert
- Common paths
- Channel sequences
- Time to conversion
```

### Typical Journeys
| Journey Type | Pattern |
|--------------|---------|
| Short | Direct → Purchase |
| Discovery | Social → Search → Purchase |
| Nurtured | Email → Email → Purchase |
| Retargeted | Search → Display → Purchase |

## Conversion Analysis

### Attribution Reports
```
Regular reporting:
- Conversions by channel
- Assisted conversions
- First-touch analysis
- Model comparison
```

### Channel Performance
| Metric | Track By Channel |
|--------|------------------|
| Conversions | Direct + assisted |
| Revenue | Attributed value |
| ROAS | Return on spend |
| CAC | Cost per acquisition |

## Multi-Touch Attribution

### Assisted Conversions
```
Credit channels that:
- Started the journey
- Appeared in path
- Influenced decision
- Not just last touch
```

### Analysis Method
```
1. Pull conversion paths
2. Identify all touches
3. Apply model
4. Allocate credit
5. Compare performance
```

## Reporting

### Weekly Attribution Report
```
ATTRIBUTION REPORT - Week of [Date]

OVERVIEW:
Total conversions: X
Total revenue: $X

BY CHANNEL (Data-Driven):
| Channel | Conv | Revenue | ROAS |
|---------|------|---------|------|
| [Channel] | X | $X | Xx |

ASSISTED CONVERSIONS:
[Channels that assisted but didn't close]

PATH INSIGHTS:
- Avg touches: X
- Avg time to convert: X days
- Most common path: [Path]

RECOMMENDATIONS:
- [Based on findings]
```

### Model Comparison
```
Compare monthly:
| Channel | Last Click | Data-Driven | Difference |
|---------|------------|-------------|------------|
| Email | X% | X% | +/-X% |
```

## Optimization Insights

### Channel Recommendations
```
Based on attribution:
- Undervalued channels to increase
- Overvalued channels to review
- Path optimization opportunities
- Budget reallocation suggestions
```

### Test Ideas
```
From path analysis:
- Sequence testing
- Touchpoint optimization
- Timing improvements
```

## Data Sources

### Integration Points
| Source | Data |
|--------|------|
| GA4 | Web behavior |
| Google Ads | Paid search |
| Facebook | Social ads |
| Klaviyo | Email |
| WooCommerce | Orders |

### Cross-Platform Matching
```
Challenges:
- Cross-device
- Cookie limitations
- Offline conversions

Solutions:
- User ID tracking
- Enhanced conversions
- First-party data
```

## Escalation

Alert Team Lead for:
- Major attribution shifts
- Channel performance changes
- Model recommendations
- Budget reallocation needs
