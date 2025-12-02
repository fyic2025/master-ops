# Marketing Copywriter - Quick Reference

## Get Copy Templates

```sql
-- All templates for a business
SELECT * FROM marketing_copy_library
WHERE business_slug = 'teelixir'
ORDER BY category, template_name;

-- By category
SELECT * FROM marketing_copy_library
WHERE business_slug = 'teelixir' AND category = 'email_subject';
```

## Voice Guidelines

```sql
SELECT voice_guidelines FROM brand_guidelines
WHERE business_slug = 'teelixir';
```

## Copy Frameworks

### AIDA (Attention, Interest, Desire, Action)
```
Attention: Hook that grabs attention
Interest: Build curiosity with benefits
Desire: Create emotional connection
Action: Clear CTA
```

### PAS (Problem, Agitate, Solution)
```
Problem: Identify the pain point
Agitate: Make it feel urgent
Solution: Present your product as the answer
```

### FAB (Features, Advantages, Benefits)
```
Feature: What the product has
Advantage: Why that feature matters
Benefit: How it improves the customer's life
```

## Subject Line Formulas

```typescript
// Question format
"Ready to {{benefit}}?"

// How-to format
"How to {{achieve_goal}} in {{timeframe}}"

// List format
"{{number}} ways to {{benefit}}"

// Urgency format
"Last chance: {{offer}} ends tonight"

// Curiosity format
"The secret to {{benefit}} (hint: it's {{product}})"
```

## Power Words by Category

### Urgency
`now, today, limited, expires, last chance, hurry, quick`

### Exclusivity
`exclusive, VIP, members-only, private, invitation-only`

### Trust
`proven, certified, guaranteed, backed, authentic`

### Value
`free, save, bonus, gift, included, extra`

### Wellness (Health brands)
`nourish, restore, balance, energize, revitalize, heal`

## Character Limits

| Platform | Limit |
|----------|-------|
| Email Subject | 50 chars optimal |
| Email Preview | 90 chars |
| SMS | 160 chars |
| Meta Ad Primary | 125 chars |
| Google Ad Headline | 30 chars |
