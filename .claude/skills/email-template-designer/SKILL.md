---
name: email-template-designer
description: Professional HTML email template design and management. Creates responsive, brand-consistent email templates with component library, variable system, and cross-client compatibility. Integrates with brand-asset-manager for styling and email-campaign-manager for sending.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Email Template Designer Skill

Master skill for creating and managing professional email templates across all 4 businesses.

## When to Activate This Skill

Activate this skill when the user mentions:
- "design email template"
- "create email layout"
- "email HTML"
- "email component"
- "responsive email"
- "email header" or "email footer"
- "email template" (design context)
- "MJML" or "email markup"
- "promotional email design"
- "newsletter template"
- "transactional email design"

## Core Capabilities

### 1. Template Design
- Create responsive HTML email templates
- Apply brand styling automatically via brand-asset-manager
- Support for all major email clients (Gmail, Outlook, Apple Mail)
- Mobile-first responsive layouts

### 2. Component Library
- Reusable components (headers, footers, CTAs, product cards)
- Business-specific and shared components
- Easy assembly of templates from components

### 3. Variable System
- Personalization tokens ({{first_name}}, {{discount_code}}, etc.)
- Dynamic content blocks
- Conditional rendering

### 4. Template Management
- Version control for templates
- Status workflow (draft → review → approved → active)
- Performance tracking (open/click rates)

## Template Types

| Type | Category | Use Case |
|------|----------|----------|
| promotional | Promotional | Sales, discounts, product launches |
| anniversary | Automated | Customer anniversary campaigns |
| winback | Automated | Re-engagement campaigns |
| welcome | Automated | New customer welcome series |
| newsletter | Newsletter | Regular content updates |
| order-confirmation | Transactional | Order confirmations |
| shipping-update | Transactional | Shipping notifications |
| b2b-outreach | B2B | Wholesale prospecting |

## Database Schema

### email_templates table
```sql
SELECT
  id,
  business_slug,
  template_slug,
  template_name,
  template_type,
  subject_line,
  preview_text,
  html_content,
  text_content,
  available_variables,
  layout_type,
  status,
  times_sent,
  avg_open_rate,
  avg_click_rate
FROM email_templates
WHERE business_slug = 'teelixir';
```

### email_template_components table
```sql
SELECT
  component_type,
  component_name,
  html_content,
  available_variables
FROM email_template_components
WHERE business_slug = 'teelixir' OR business_slug IS NULL;
```

## Template Structure

### Standard Email Layout
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: {{background_color}};">
  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    {{preview_text}}
  </div>

  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <!-- Email Content (600px max) -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px;">

          <!-- HEADER COMPONENT -->
          {{> header}}

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 30px; background-color: #ffffff;">
              {{content}}
            </td>
          </tr>

          <!-- FOOTER COMPONENT -->
          {{> footer}}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Available Variables

### Standard Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `{{first_name}}` | Recipient first name | "Jane" |
| `{{last_name}}` | Recipient last name | "Smith" |
| `{{email}}` | Recipient email | "jane@example.com" |
| `{{unsubscribe_url}}` | Unsubscribe link | URL |
| `{{view_in_browser_url}}` | Web version link | URL |

### Campaign Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `{{discount_code}}` | Discount code | "SAVE15" |
| `{{discount_percent}}` | Discount percentage | "15" |
| `{{expiry_date}}` | Offer expiry | "December 15, 2025" |
| `{{product_name}}` | Featured product | "Lion's Mane" |
| `{{product_url}}` | Product link | URL |
| `{{product_image}}` | Product image URL | URL |

### Brand Variables (auto-populated from brand-asset-manager)
| Variable | Description |
|----------|-------------|
| `{{brand_name}}` | Business name |
| `{{brand_logo}}` | Logo URL |
| `{{primary_color}}` | Primary brand color |
| `{{website_url}}` | Website URL |
| `{{social_instagram}}` | Instagram URL |
| `{{social_facebook}}` | Facebook URL |

## API Reference

### Create Template
```typescript
import { createClient } from '@supabase/supabase-js';
import { getEmailContext } from '../brand-asset-manager/scripts/brand-client';

async function createTemplate(
  businessSlug: string,
  templateSlug: string,
  templateData: {
    name: string;
    type: string;
    subject: string;
    previewText?: string;
    htmlContent: string;
    textContent?: string;
    variables?: Array<{ name: string; required: boolean; default?: string }>;
  }
) {
  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      business_slug: businessSlug,
      template_slug: templateSlug,
      template_name: templateData.name,
      template_type: templateData.type,
      subject_line: templateData.subject,
      preview_text: templateData.previewText,
      html_content: templateData.htmlContent,
      text_content: templateData.textContent,
      available_variables: templateData.variables || [],
      status: 'draft'
    })
    .select()
    .single();

  return data;
}
```

### Render Template
```typescript
async function renderTemplate(
  templateId: string,
  variables: Record<string, string>
): Promise<{ html: string; text: string; subject: string }> {
  // Fetch template
  const { data: template } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  // Get brand context
  const brandContext = await getEmailContext(template.business_slug);

  // Merge variables
  const allVars = {
    // Brand variables
    brand_name: brandContext.fromName,
    brand_logo: brandContext.logo,
    primary_color: brandContext.colors.primary,
    website_url: brandContext.websiteUrl,
    social_instagram: brandContext.socialLinks.instagram,
    social_facebook: brandContext.socialLinks.facebook,
    // User variables
    ...variables
  };

  // Replace variables in content
  let html = template.html_content;
  let text = template.text_content || '';
  let subject = template.subject_line;

  for (const [key, value] of Object.entries(allVars)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    html = html.replace(pattern, value || '');
    text = text.replace(pattern, value || '');
    subject = subject.replace(pattern, value || '');
  }

  return { html, text, subject };
}
```

### Get Components
```typescript
async function getComponents(
  businessSlug: string,
  componentType?: string
): Promise<Component[]> {
  let query = supabase
    .from('email_template_components')
    .select('*')
    .or(`business_slug.eq.${businessSlug},business_slug.is.null`)
    .eq('is_active', true);

  if (componentType) {
    query = query.eq('component_type', componentType);
  }

  const { data } = await query.order('component_type');
  return data || [];
}
```

## Component Library

### Header Component
```html
<!-- HEADER: Brand logo + navigation -->
<tr>
  <td style="padding: 20px; background-color: {{primary_color}}; text-align: center;">
    <a href="{{website_url}}">
      <img src="{{brand_logo}}" alt="{{brand_name}}" width="180" style="max-width: 180px; height: auto;">
    </a>
  </td>
</tr>
```

### CTA Button Component
```html
<!-- CTA: Primary action button -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
  <tr>
    <td style="border-radius: 4px; background-color: {{primary_color}};">
      <a href="{{cta_url}}" style="display: inline-block; padding: 14px 28px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none;">
        {{cta_text}}
      </a>
    </td>
  </tr>
</table>
```

### Product Card Component
```html
<!-- PRODUCT CARD: Featured product -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td style="padding: 20px; background-color: #f8f8f8; border-radius: 8px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td width="150" valign="top">
            <img src="{{product_image}}" alt="{{product_name}}" width="130" style="border-radius: 4px;">
          </td>
          <td style="padding-left: 20px;" valign="top">
            <h3 style="margin: 0 0 10px; font-size: 18px; color: {{primary_color}};">{{product_name}}</h3>
            <p style="margin: 0 0 15px; font-size: 14px; color: #666;">{{product_description}}</p>
            <a href="{{product_url}}" style="color: {{primary_color}}; font-weight: bold;">Shop Now →</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

### Footer Component
```html
<!-- FOOTER: Social links + unsubscribe -->
<tr>
  <td style="padding: 30px; background-color: #333333; text-align: center;">
    <!-- Social Links -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
      <tr>
        <td style="padding: 0 10px;">
          <a href="{{social_instagram}}"><img src="https://example.com/instagram-icon.png" alt="Instagram" width="24"></a>
        </td>
        <td style="padding: 0 10px;">
          <a href="{{social_facebook}}"><img src="https://example.com/facebook-icon.png" alt="Facebook" width="24"></a>
        </td>
      </tr>
    </table>
    <!-- Unsubscribe -->
    <p style="margin: 20px 0 0; font-size: 12px; color: #999999;">
      <a href="{{unsubscribe_url}}" style="color: #999999;">Unsubscribe</a> |
      <a href="{{view_in_browser_url}}" style="color: #999999;">View in browser</a>
    </p>
    <p style="margin: 10px 0 0; font-size: 11px; color: #666666;">
      {{brand_name}} | {{physical_address}}
    </p>
  </td>
</tr>
```

## Email Client Compatibility

### Guidelines for Cross-Client Support

| Feature | Gmail | Outlook | Apple Mail | Mobile |
|---------|-------|---------|------------|--------|
| Max width | 600px | 600px | 600px | 100% |
| CSS | Inline only | Inline + conditional | Full | Inline |
| Images | Load | Blocked by default | Load | Load |
| Web fonts | No | No | Yes | Limited |
| Media queries | Limited | No | Yes | Yes |

### Outlook-Specific Fixes
```html
<!--[if mso]>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600">
<tr><td>
<![endif]-->

  <!-- Your content here -->

<!--[if mso]>
</td></tr>
</table>
<![endif]-->
```

## Reference Files

- Database: `infra/supabase/migrations/20251203_marketing_skills_foundation.sql`
- Brand integration: `brand-asset-manager/scripts/brand-client.ts`
- Existing templates: `email-campaign-manager/templates/`

## Integration Points

This skill integrates with:
- **brand-asset-manager**: Fetches colors, fonts, logos for templates
- **marketing-copywriter**: Receives copy for template sections
- **email-preview-tester**: Sends templates for rendering tests
- **email-campaign-manager**: Provides templates for sending

## Guardrails

1. **600px max width**: Never exceed for email compatibility
2. **Inline CSS only**: Gmail strips `<style>` tags
3. **Table-based layouts**: Required for Outlook
4. **Alt text required**: All images must have alt text
5. **Unsubscribe link required**: Must include in every email

## Success Criteria

- Templates render correctly in Gmail, Outlook, Apple Mail
- Mobile responsiveness verified (320px-600px)
- Brand colors and fonts correctly applied
- Variable substitution works without errors
- Load time <3s on slow connections

## Emergency Procedures

If templates not rendering:
1. Check for unclosed HTML tags
2. Verify all images have full URLs (not relative)
3. Test inline CSS validity
4. Check for JavaScript (not allowed in email)
