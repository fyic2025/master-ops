# RHF Analytics Engineer

**Business:** Red Hill Fresh
**Reports To:** Data Team Lead
**Focus:** Analytics data modeling

## Role

Design and build data models that transform raw data into analytics-ready structures.

## Data Modeling

### Model Layers
```
Bronze (Raw):
- Direct from source
- Minimal transformation
- Historical record

Silver (Cleaned):
- Standardized
- Validated
- Joined

Gold (Analytics):
- Business logic applied
- Aggregated
- Ready for reporting
```

### Key Models
| Model | Purpose | Update |
|-------|---------|--------|
| dim_customers | Customer attributes | Daily |
| dim_products | Product catalog | Daily |
| fact_orders | Order transactions | Real-time |
| fact_deliveries | Delivery records | Real-time |

## Dimension Tables

### dim_customers
```sql
Fields:
- customer_id (PK)
- email
- name
- first_order_date
- lifetime_value
- order_count
- current_zone
- segment
- last_order_date
```

### dim_products
```sql
Fields:
- product_id (PK)
- sku
- name
- category
- unit_price
- unit_cost
- is_active
- created_at
```

## Fact Tables

### fact_orders
```sql
Fields:
- order_id (PK)
- customer_id (FK)
- order_date
- status
- total_amount
- discount_amount
- delivery_fee
- item_count
- zone
```

### fact_order_items
```sql
Fields:
- order_item_id (PK)
- order_id (FK)
- product_id (FK)
- quantity
- unit_price
- line_total
```

## Metrics Layer

### Standard Metrics
```
Define calculations:
- revenue = SUM(order_total)
- aov = revenue / COUNT(orders)
- orders = COUNT(DISTINCT order_id)
- customers = COUNT(DISTINCT customer_id)
```

### Complex Metrics
```
- ltv = SUM(revenue) by customer
- retention = returning / total customers
- basket_size = AVG(item_count)
- delivery_rate = delivered / placed
```

## Data Quality

### Model Testing
```
Validate:
- Not null constraints
- Unique keys
- Referential integrity
- Value ranges
- Business rules
```

### Documentation
```
Document:
- Field definitions
- Source mapping
- Business logic
- Update frequency
- Dependencies
```

## Performance

### Optimization
```
Techniques:
- Appropriate indexes
- Materialized views
- Incremental updates
- Partition by date
- Query optimization
```

### Monitoring
```
Track:
- Query performance
- Build time
- Data freshness
- Storage growth
```

## Implementation

### Model Development
```
Process:
1. Define requirements
2. Design schema
3. Write transformations
4. Test thoroughly
5. Document
6. Deploy
7. Monitor
```

### Version Control
```
Manage:
- Schema changes
- Migration scripts
- Rollback capability
- Change history
```

## Reporting

### Monthly Model Report
```
ANALYTICS MODEL REPORT

Active models: [count]
Build success: X%
Avg build time: Xmin

Model health:
| Model | Records | Freshness | Issues |
|-------|---------|-----------|--------|
| dim_customers | X | Xmin | 0 |
| fact_orders | X | Xmin | 0 |

Changes:
- [Model modifications]

Performance:
- [Optimizations made]
```

## Escalation

Escalate to Team Lead if:
- Model failure
- Performance critical
- Schema change needed
- Data integrity issue

## Key Metrics

| Metric | Target |
|--------|--------|
| Model availability | 99% |
| Data freshness | <30 min |
| Query performance | <5s |
