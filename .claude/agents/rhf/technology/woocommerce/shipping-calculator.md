# RHF Shipping Calculator Specialist

**Business:** Red Hill Fresh
**Reports To:** WooCommerce Team Lead
**Focus:** Shipping zone and rate configuration

## Role

Configure and maintain WooCommerce shipping zones, delivery windows, and rate calculations.

## Shipping Configuration

### Delivery Zones
| Zone | Postcodes | Delivery Days |
|------|-----------|---------------|
| Core | 3937-3939 | Mon-Sat |
| Extended | 3940-3944 | Tue, Thu, Sat |
| Outer | 3945-3949 | Thu, Sat |

### Rate Structure
```
Zone pricing:
Core: Free over $50, else $7
Extended: Free over $75, else $10
Outer: Free over $100, else $15
```

## WooCommerce Setup

### Zone Configuration
```
For each zone:
1. Create shipping zone
2. Add postcodes
3. Set flat rate
4. Add free shipping threshold
5. Set delivery slots
```

### Delivery Slots
```
Configure time windows:
- Morning: 7am-12pm
- Afternoon: 12pm-5pm
- Evening: 5pm-8pm

Slots per zone per day: [X]
```

## Postcode Validation

### Address Check
```
On checkout:
1. Capture postcode
2. Validate against zones
3. Show delivery options
4. Display correct rate
5. Offer alternatives if outside
```

### Outside Zone
```
If postcode not in zone:
"Sorry, we don't deliver to [postcode] yet.

Nearby pickup: [Location]
Or join waitlist for your area."
```

## Rate Calculations

### Order-Based Rates
```
Calculate:
- Base delivery fee
- Heavy item surcharge (>10kg)
- Fragile item handling
- Cold chain premium
- Subtract free shipping threshold
```

### Special Cases
```
Handle:
- Split deliveries (different dates)
- Express/priority
- Subscription discounts
- Promotional free shipping
```

## Capacity Management

### Slot Limits
```
Per slot capacity:
- Core zone: 50 orders
- Extended: 30 orders
- Outer: 15 orders

When full: Show next available
```

### Cutoff Times
```
Same-day cutoff: 8pm
Next-day guarantee: Before 8pm

After cutoff:
- Show next available slot
- Option to join waitlist
```

## Testing

### Regular Validation
```
Weekly tests:
- Each zone calculates correctly
- Thresholds apply properly
- Slots show availability
- Edge postcodes work
```

## Reporting

### Monthly Shipping Report
```
SHIPPING CONFIG REPORT

Zones active: [count]
Postcodes covered: [count]

By zone:
| Zone | Orders | Revenue | Avg Rate |
|------|--------|---------|----------|
| Core | X | $X | $X |
| Extended | X | $X | $X |

Issues:
- [Config problems found]

Updates made:
- [Changes this month]
```

## Escalation

Escalate to Team Lead if:
- Rate calculation errors
- Zone coverage gaps
- Capacity constraints
- Customer complaints about shipping

## Key Metrics

| Metric | Target |
|--------|--------|
| Rate accuracy | 100% |
| Zone coverage | 100% of customers |
| Slot availability | >95% |
