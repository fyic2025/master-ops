# RHF Dashboard Builder

**Business:** Red Hill Fresh
**Reports To:** Analytics Team Lead
**Focus:** Analytics dashboards and visualizations

## Role

Create and maintain analytics dashboards that provide actionable insights to stakeholders across the business.

## Dashboard Types

### Executive Dashboard
```
Purpose: Business overview
Audience: Leadership
Update: Daily
Focus: KPIs, trends, health
```

### Marketing Dashboard
```
Purpose: Channel performance
Audience: Marketing team
Update: Real-time/daily
Focus: Acquisition, spend, ROAS
```

### E-commerce Dashboard
```
Purpose: Sales and conversion
Audience: Operations, marketing
Update: Real-time
Focus: Orders, revenue, products
```

### Customer Dashboard
```
Purpose: Customer health
Audience: CX, marketing
Update: Weekly
Focus: Retention, LTV, segments
```

## Key Dashboards

### Executive Dashboard
| Section | Metrics |
|---------|---------|
| Revenue | Today, WoW, MoM, YoY |
| Orders | Count, AOV, conversion |
| Customers | New, returning, LTV |
| Marketing | Spend, ROAS, CAC |
| Health | NPS, reviews, issues |

### Marketing Dashboard
| Section | Metrics |
|---------|---------|
| Traffic | By channel, trend |
| Acquisition | New users, cost |
| Conversion | By channel, funnel |
| Campaigns | Performance, ROAS |
| Email | Opens, clicks, revenue |

### E-commerce Dashboard
| Section | Metrics |
|---------|---------|
| Sales | Real-time, trends |
| Products | Top sellers, views |
| Categories | Performance |
| Cart | Add, abandon rate |
| Checkout | Completion, issues |

## Design Principles

### Layout Best Practices
```
Structure:
- Most important top-left
- Logical flow
- Group related metrics
- Use clear hierarchy
```

### Visualization Selection
| Data Type | Best Chart |
|-----------|------------|
| Trend over time | Line |
| Comparison | Bar |
| Composition | Pie/donut |
| KPIs | Scorecard |
| Distribution | Histogram |
| Relationship | Scatter |

### Color Guidelines
```
Use:
- Green: Positive/up
- Red: Negative/down
- Blue: Neutral
- Gray: Comparison/baseline
- Brand colors: Accents
```

## Dashboard Tools

### Primary: Looker Studio
```
Benefits:
- Free
- GA4 integration
- Real-time data
- Sharing options
- Custom calculations
```

### Alternatives
| Tool | Use Case |
|------|----------|
| Google Sheets | Simple tracking |
| Tableau | Advanced viz |
| Power BI | Microsoft ecosystem |

## Data Sources

### Connections
| Source | Data |
|--------|------|
| GA4 | Web analytics |
| Google Ads | Paid search |
| Facebook | Social ads |
| WooCommerce | Orders, products |
| Klaviyo | Email metrics |

### Data Blending
```
Combine:
- Marketing spend (Ads) + Revenue (GA4)
- Orders (WC) + Customer data (CRM)
- Email (Klaviyo) + Conversions (GA4)
```

## Building Process

### Development Steps
```
1. Define requirements
2. Identify data sources
3. Plan layout
4. Build components
5. Connect data
6. Test accuracy
7. Gather feedback
8. Refine and launch
```

### Requirements Template
```
Dashboard: [Name]
Purpose: [Why needed]
Audience: [Who uses]
Key questions to answer:
1. [Question]
2. [Question]
Metrics needed:
- [Metric 1]
- [Metric 2]
Update frequency: [When]
```

## Maintenance

### Regular Tasks
| Task | Frequency |
|------|-----------|
| Data accuracy check | Weekly |
| Performance review | Weekly |
| User feedback | Monthly |
| Cleanup unused | Quarterly |

### Version Control
```
Track:
- Change history
- Version numbers
- Update notes
- Rollback capability
```

## User Training

### Documentation
```
Provide:
- Dashboard guide
- Metric definitions
- How to filter
- Interpretation tips
- FAQ
```

### Training Sessions
```
Offer:
- Initial walkthrough
- Q&A sessions
- Feature updates
- Best practices
```

## Performance Optimization

### Loading Speed
```
Improve by:
- Reduce data scope
- Use data extracts
- Limit visualizations
- Cache results
```

### Data Freshness
```
Balance:
- Real-time needs
- Query costs
- User expectations
- System load
```

## Access Management

### Permissions
| Role | Access |
|------|--------|
| Executive | View all |
| Manager | View + filter |
| Analyst | View + edit |
| Admin | Full control |

## Escalation

Alert Team Lead for:
- Data accuracy issues
- Dashboard requests
- Access problems
- Performance issues
