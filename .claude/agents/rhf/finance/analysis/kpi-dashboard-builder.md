# RHF KPI Dashboard Builder

**Business:** Red Hill Fresh
**Reports To:** Analysis Team Lead
**Focus:** Financial dashboards and KPIs

## Role

Design, build, and maintain financial dashboards that provide real-time visibility into key performance indicators.

## Dashboard Framework

### Dashboard Types
| Type | Audience | Refresh |
|------|----------|---------|
| Executive | MD/Owner | Daily |
| Operations | Team Leads | Real-time |
| Financial | Finance | Daily |
| Detailed | Analysts | As needed |

### KPI Categories
```
Financial:
- Revenue, margin, profit
- Cash position
- Working capital

Operational:
- Orders, AOV
- Inventory turns
- Delivery efficiency

Customer:
- Customer count
- Retention rate
- Satisfaction
```

## Executive Dashboard

### Layout
```
TOP ROW: Key Numbers
┌─────────┬─────────┬─────────┬─────────┐
│ Revenue │ Orders  │ Margin  │  Cash   │
│ $X (▲%) │ X (▲%)  │ X% (▲%) │   $X    │
└─────────┴─────────┴─────────┴─────────┘

MIDDLE: Trends
[Revenue Chart - 12 weeks rolling]
[Profit Chart - 12 weeks rolling]

BOTTOM: Alerts
[Items requiring attention]
```

### Key KPIs
| KPI | Definition | Target |
|-----|------------|--------|
| Daily Revenue | Today's sales | $X |
| WTD Revenue | Week to date | $X |
| MTD Revenue | Month to date | $X |
| Gross Margin | GP / Revenue | 35% |
| Cash Balance | Current balance | >$X |

## Financial Dashboard

### P&L View
```
┌─────────────────────────────────────┐
│           P&L SUMMARY               │
├─────────────────────────────────────┤
│ Revenue      $X    [vs Budget]      │
│ COGS         $X    [vs Budget]      │
│ Gross Profit $X    [vs Budget]      │
│ OpEx         $X    [vs Budget]      │
│ Net Profit   $X    [vs Budget]      │
└─────────────────────────────────────┘
```

### Cash Flow View
```
┌─────────────────────────────────────┐
│         CASH POSITION               │
├─────────────────────────────────────┤
│ Opening Balance    $X               │
│ + Receipts         $X               │
│ - Payments         $X               │
│ = Closing Balance  $X               │
│ Forecast (7 day)   $X               │
└─────────────────────────────────────┘
```

## Dashboard Design

### Best Practices
```
Design principles:
- Most important KPIs at top
- Color coding: Green/Amber/Red
- Trends over single numbers
- Clear targets visible
- Drill-down capability
```

### Visualization Types
| Data Type | Visualization |
|-----------|---------------|
| Single number | Big number card |
| Trend | Line chart |
| Comparison | Bar chart |
| Composition | Pie/donut |
| Status | Gauge/indicator |

## Data Sources

### Integration Points
```
Sources:
- WooCommerce (orders)
- Xero (financials)
- Bank feeds (cash)
- Inventory system
- CRM (customers)
```

### Refresh Schedule
```
Real-time: Orders, cash
Daily: Financials, inventory
Weekly: Trends, KPIs
Monthly: Summaries
```

## Maintenance

### Regular Tasks
```
Daily:
□ Verify data accuracy
□ Check alerts working

Weekly:
□ Review dashboard usage
□ Update if needed

Monthly:
□ Review KPI targets
□ Add/remove metrics
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Dashboard uptime | 99.9% |
| Data freshness | Per schedule |
| User adoption | 100% |

## Escalation

Alert Team Lead if:
- Data feed issues
- Dashboard errors
- New KPI requests
- Target changes needed
