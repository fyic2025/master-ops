# Email Template Designer - Quick Reference

## Get All Templates for Business

```sql
SELECT template_slug, template_name, template_type, status, avg_open_rate
FROM email_templates
WHERE business_slug = 'teelixir'
ORDER BY template_type, template_name;
```

## Get Template by Slug

```sql
SELECT *
FROM email_templates
WHERE business_slug = 'teelixir'
  AND template_slug = 'anniversary-15';
```

## Get Components

```sql
SELECT component_type, component_name, html_content
FROM email_template_components
WHERE (business_slug = 'teelixir' OR business_slug IS NULL)
  AND is_active = TRUE
ORDER BY component_type;
```

## Create New Template

```sql
INSERT INTO email_templates (
  business_slug,
  template_slug,
  template_name,
  template_type,
  subject_line,
  preview_text,
  html_content,
  status
) VALUES (
  'teelixir',
  'my-new-template',
  'My New Template',
  'promotional',
  'Your Subject Line Here',
  'Preview text shown in inbox',
  '<html>...</html>',
  'draft'
);
```

## Update Template Status

```sql
UPDATE email_templates
SET status = 'active',
    approved_by = 'user@example.com',
    approved_at = NOW()
WHERE template_slug = 'anniversary-15'
  AND business_slug = 'teelixir';
```

## Standard Variables

| Variable | Description |
|----------|-------------|
| `{{first_name}}` | Recipient first name |
| `{{last_name}}` | Recipient last name |
| `{{email}}` | Recipient email |
| `{{discount_code}}` | Discount code |
| `{{discount_percent}}` | Discount percentage |
| `{{product_name}}` | Featured product |
| `{{unsubscribe_url}}` | Unsubscribe link |

## Brand Variables (Auto-populated)

| Variable | Source |
|----------|--------|
| `{{brand_name}}` | brand_guidelines.business_name |
| `{{brand_logo}}` | brand_assets.logo_primary |
| `{{primary_color}}` | brand_guidelines.primary_color |
| `{{website_url}}` | brand_guidelines.website_url |
| `{{social_instagram}}` | brand_guidelines.social_links.instagram |

## Email Width Standards

```
Desktop: 600px max
Mobile: 100% (fluid)
Padding: 20px sides
Content area: 560px
```

## Color Usage

```
Background: Use brand background_color
Headers: Use brand primary_color
Text: Use brand text_color (#333333)
Links: Use brand primary_color
Muted: Use brand muted_text_color (#666666)
```

## Template Types

| Type | Use Case |
|------|----------|
| `promotional` | Sales, discounts |
| `automated` | Anniversary, winback, welcome |
| `newsletter` | Regular updates |
| `transactional` | Order confirmations |
| `b2b` | Wholesale outreach |

## Status Workflow

```
draft → review → approved → active → archived
```

## Common Components

| Component | Type |
|-----------|------|
| Brand header | `header` |
| Brand footer | `footer` |
| CTA button | `cta-button` |
| Product card | `product-card` |
| Divider | `divider` |
| Social links | `social-links` |
| Discount box | `discount-box` |

## Render Template (Code)

```typescript
import { renderTemplate } from './scripts/template-client';

const { html, text, subject } = await renderTemplate('template-id', {
  first_name: 'Jane',
  discount_code: 'SAVE15',
  product_name: 'Lion\'s Mane'
});
```

## Test Template

```typescript
import { validateTemplate } from './scripts/template-validator';

const issues = await validateTemplate(htmlContent);
// Returns: { errors: [], warnings: [] }
```
