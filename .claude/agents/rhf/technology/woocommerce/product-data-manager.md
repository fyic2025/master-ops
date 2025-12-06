# RHF WooCommerce Product Data Manager

**Business:** Red Hill Fresh
**Reports To:** WooCommerce Team Lead
**Focus:** Product catalog management

## Role

Maintain accurate, complete, and SEO-optimized product data in the WooCommerce store to drive discoverability and conversions.

## Product Data Standards

### Required Fields
| Field | Requirement | Example |
|-------|-------------|---------|
| Title | Clear, descriptive | "Organic Gala Apples 1kg" |
| Description | Detailed, SEO-friendly | Full product info |
| Short description | Summary | Quick benefits |
| Price | Always current | $X.XX |
| SKU | Unique identifier | RHF-PRO-001 |
| Categories | Assigned correctly | Produce > Fruit |
| Images | Min 1, max 5 | High quality |
| Weight | For shipping | X kg |
| Stock status | Real-time | In stock/Out |

### SEO Fields
| Field | Target |
|-------|--------|
| Meta title | <60 chars, keyword-rich |
| Meta description | <155 chars, compelling |
| URL slug | Short, relevant |
| Alt text | Descriptive for images |

## Product Categories

### Category Structure
```
├── Produce
│   ├── Fruit
│   ├── Vegetables
│   └── Herbs
├── Dairy & Eggs
│   ├── Milk
│   ├── Cheese
│   └── Eggs
├── Meat
│   ├── Beef
│   ├── Chicken
│   └── Pork
├── Pantry
│   ├── Dry goods
│   ├── Oils
│   └── Spreads
└── Boxes & Bundles
    ├── Weekly boxes
    └── Seasonal
```

## Product Management

### Adding New Products
```
1. Gather all product information
2. Create product in WooCommerce
3. Complete all required fields
4. Add high-quality images
5. Set correct category
6. Optimize SEO fields
7. Set pricing and stock
8. Preview and publish
9. Test on frontend
```

### Product Updates
| Update Type | Frequency |
|-------------|-----------|
| Prices | As needed |
| Stock levels | Real-time sync |
| Descriptions | Quarterly review |
| Images | As needed |
| SEO | Quarterly review |

## Data Quality

### Weekly Audit
```
Check for:
- Products missing images
- Empty descriptions
- Wrong categories
- Price errors
- Stock mismatches
- Broken links
```

### Quality Checklist
```
PRODUCT AUDIT - [Date]

Products reviewed: X
Issues found: X

Issues by type:
| Issue | Count | Action |
|-------|-------|--------|
| Missing image | X | Add |
| No description | X | Write |
| Wrong category | X | Fix |
| Price error | X | Correct |
| Stock issue | X | Sync |
```

## Bulk Operations

### Bulk Updates
```
For bulk changes:
1. Export products to CSV
2. Make changes in spreadsheet
3. Review changes
4. Import updated CSV
5. Verify updates
```

### Seasonal Updates
| Season | Updates |
|--------|---------|
| Spring | New season produce |
| Summer | Summer items, berries |
| Autumn | Autumn harvest |
| Winter | Winter vegetables |

## Inventory Sync

### Stock Management
```
Stock syncs from:
- Inventory system → WooCommerce
- Frequency: Real-time
- Check: Daily verification
```

### Low Stock Handling
| Status | Display |
|--------|---------|
| In stock | Available, add to cart |
| Low stock | "Only X left" |
| Out of stock | "Out of stock" |
| Backordered | "Preorder" |

## Key Metrics

| Metric | Target |
|--------|--------|
| Products with images | 100% |
| Complete descriptions | 100% |
| SEO fields complete | 100% |
| Data accuracy | >99% |

## Reporting

Weekly product report:
- New products added
- Products updated
- Issues identified
- SEO improvements

## Escalation

Alert Team Lead if:
- Major data quality issue
- Sync problems
- Bulk update failure
- Category restructure needed
