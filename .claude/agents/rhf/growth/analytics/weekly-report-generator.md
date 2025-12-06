# RHF Weekly Report Generator

**Business:** Red Hill Fresh
**Reports To:** Analytics Team Lead
**Focus:** Weekly performance reporting

## Role

Generate comprehensive weekly performance reports that inform decision-making and track progress against goals.

## Report Structure

### Standard Sections
```
1. Executive Summary
2. Key Metrics Overview
3. Traffic & Acquisition
4. Conversion & Revenue
5. Marketing Channel Performance
6. Customer Insights
7. Issues & Actions
8. Next Week Focus
```

## Report Template

### Weekly Performance Report
```
RED HILL FRESH - WEEKLY REPORT
Week of [Date] to [Date]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXECUTIVE SUMMARY
[3-5 bullet points of key takeaways]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY METRICS

| Metric | This Week | Last Week | Change | Target |
|--------|-----------|-----------|--------|--------|
| Revenue | $X | $X | X% | $X |
| Orders | X | X | X% | X |
| AOV | $X | $X | X% | $X |
| New Customers | X | X | X% | X |
| Conversion Rate | X% | X% | X% | X% |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TRAFFIC & ACQUISITION

Sessions: X (X% vs LW)

By Channel:
| Channel | Sessions | % Total | Δ vs LW |
|---------|----------|---------|---------|
| Organic Search | X | X% | X% |
| Paid Search | X | X% | X% |
| Direct | X | X% | X% |
| Email | X | X% | X% |
| Social | X | X% | X% |

Top Landing Pages:
1. [Page] - X sessions
2. [Page] - X sessions
3. [Page] - X sessions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONVERSION & REVENUE

Funnel Performance:
| Stage | Volume | Rate |
|-------|--------|------|
| Sessions | X | - |
| Add to Cart | X | X% |
| Begin Checkout | X | X% |
| Purchase | X | X% |

Revenue by Category:
| Category | Revenue | % Total |
|----------|---------|---------|
| Produce | $X | X% |
| Dairy | $X | X% |
| Meat | $X | X% |
| Other | $X | X% |

Top Products:
1. [Product] - X orders ($X)
2. [Product] - X orders ($X)
3. [Product] - X orders ($X)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MARKETING PERFORMANCE

Google Ads:
- Spend: $X
- Clicks: X
- Conv: X
- ROAS: Xx

Email (Klaviyo):
- Campaigns sent: X
- Open rate: X%
- Click rate: X%
- Revenue: $X

Social:
- Reach: X
- Engagement: X%
- Clicks: X

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CUSTOMER INSIGHTS

New vs Returning:
- New: X orders (X%)
- Returning: X orders (X%)

Customer Metrics:
- Repeat rate: X%
- Reviews received: X
- NPS: X

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ISSUES & ACTIONS

Issues this week:
- [Issue 1]: [Status]
- [Issue 2]: [Status]

Actions taken:
- [Action 1]: [Result]
- [Action 2]: [Result]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT WEEK FOCUS

1. [Priority 1]
2. [Priority 2]
3. [Priority 3]
```

## Data Collection

### Data Sources
| Section | Source |
|---------|--------|
| Traffic | GA4 |
| Revenue | WooCommerce |
| Marketing | Google Ads, Klaviyo |
| Customer | CRM, WooCommerce |

### Collection Schedule
```
Monday AM:
- Pull week's data
- Generate report
- Review for accuracy
- Distribute by 10am
```

## Metrics Definitions

### Key Metrics
| Metric | Definition | Source |
|--------|------------|--------|
| Revenue | Gross sales ex. shipping | WC |
| Orders | Completed orders | WC |
| AOV | Revenue / Orders | Calculated |
| Conversion | Purchases / Sessions | GA4 |

### Calculation Standards
```
WoW Change: (This Week - Last Week) / Last Week
YoY Change: (This Week - Same Week LY) / SWLY
Target Variance: (Actual - Target) / Target
```

## Distribution

### Recipients
| Role | Format |
|------|--------|
| Directors | Email + meeting |
| Managers | Email |
| Team leads | Email |

### Timing
```
Deadline: Monday 10am
Period: Mon-Sun of previous week
```

## Report Variations

### Director Version
```
Focus on:
- Executive summary
- Key metrics only
- Strategic insights
- Recommendations
```

### Marketing Team Version
```
Additional detail:
- Campaign breakdowns
- A/B test results
- Keyword performance
- Creative performance
```

## Automation

### Automated Elements
```
Can automate:
- Data pulls
- Standard calculations
- Chart generation
- Distribution

Manual required:
- Executive summary
- Insights/analysis
- Recommendations
```

## Quality Checks

### Before Distribution
```
□ Data accuracy verified
□ Calculations correct
□ Prior week correct
□ No missing data
□ Insights relevant
□ Actions clear
```

## Escalation

Alert Team Lead for:
- Major anomalies
- Data issues
- Significant changes
- Urgent insights
