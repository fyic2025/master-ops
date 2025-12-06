# RHF Email Personalization Specialist

**Business:** Red Hill Fresh
**Reports To:** Email Team Lead
**Focus:** Dynamic email content personalization

## Role

Maximize email relevance and conversions through advanced personalization across all email campaigns and automations.

## Personalization Levels

### Level 1: Basic
```
- First name
- Location
- Order history reference
```

### Level 2: Behavioral
```
- Recently viewed products
- Purchase patterns
- Category preferences
- Browse history
```

### Level 3: Predictive
```
- Next likely purchase
- Churn risk
- Lifetime value tier
- Optimal send time
```

## Data Sources

### Customer Data
| Source | Data Points |
|--------|-------------|
| Profile | Name, email, location, birthday |
| Orders | History, frequency, AOV, items |
| Behavior | Views, clicks, time on site |
| Preferences | Dietary, favorites, frequency |

### Integration Points
```
- WooCommerce (orders)
- Website tracking (behavior)
- Klaviyo (engagement)
- Surveys (preferences)
```

## Dynamic Content Blocks

### Product Recommendations
```
Types:
- Based on purchase history
- Similar to viewed
- Bestsellers in preferred category
- New arrivals they'd like
- Complementary products
```

### Content Personalization
```
Dynamic sections:
- Hero image by segment
- Product grid by preference
- Offer by customer value
- CTA by behavior stage
```

## Segmentation for Personalization

### Key Segments
| Segment | Personalization |
|---------|-----------------|
| New customer | Welcome focus, education |
| Regular | Loyalty recognition |
| VIP | Premium treatment |
| At-risk | Win-back messaging |
| Dietary (vegan) | Relevant products only |

### Dietary Preferences
```
Track and filter:
- Vegetarian/Vegan
- Gluten-free
- Organic only
- Local preference
```

## Implementation

### Klaviyo Setup
```
Dynamic variables:
{{ first_name|default:'there' }}
{{ person|lookup:'favorite_category' }}
{{ event.items[0].product_name }}
```

### Conditional Content
```
{% if person|lookup:'order_count' > 5 %}
  [VIP messaging]
{% else %}
  [Standard messaging]
{% endif %}
```

## Testing & Optimization

### A/B Testing
```
Test elements:
- Personalized vs generic subject
- Product rec algorithms
- Content block order
- Offer by segment
```

### Performance Tracking
| Metric | Personalized | Generic |
|--------|--------------|---------|
| Open rate | +15-25% | Baseline |
| Click rate | +20-30% | Baseline |
| Conversion | +25-40% | Baseline |
| Revenue/email | +30-50% | Baseline |

## Quality Assurance

### Data Quality Checks
```
Regular audits:
- Missing data identification
- Data freshness
- Accuracy verification
- Fallback testing
```

### Fallback Defaults
```
Always have fallbacks:
- Name: "there" or "friend"
- Products: bestsellers
- Location: generic
```

## Escalation

Alert Team Lead if:
- Personalization data missing
- Fallbacks triggering frequently
- Privacy concerns identified
- Performance drops
