# Email Template Specifications

Technical specifications for email templates across all platforms and clients.

## Dimensions

### Container Widths
| Element | Width | Notes |
|---------|-------|-------|
| Outer table | 100% | Full width wrapper |
| Main container | 600px max | Industry standard |
| Content area | 560px | 20px padding each side |
| Mobile breakpoint | 480px | Stack to single column |

### Image Sizes
| Image Type | Width | Format |
|------------|-------|--------|
| Hero image | 600px | JPG, PNG |
| Product image | 200-300px | JPG, PNG |
| Logo | 180px max | PNG (transparent) |
| Icon | 24-32px | PNG or SVG (inline) |

## Typography

### Font Stacks (Email-Safe)
```css
/* Sans-serif (Default) */
font-family: Arial, Helvetica, sans-serif;

/* Serif */
font-family: Georgia, Times, serif;

/* Monospace (for codes) */
font-family: 'Courier New', monospace;
```

### Font Sizes
| Element | Size | Line Height |
|---------|------|-------------|
| H1 | 28px | 1.2 |
| H2 | 22px | 1.3 |
| H3 | 18px | 1.3 |
| Body | 16px | 1.6 |
| Small | 14px | 1.5 |
| Footer | 12px | 1.4 |

## Color Usage

### By Business
| Business | Primary | Secondary | Accent |
|----------|---------|-----------|--------|
| Teelixir | #1B4D3E | #D4AF37 | #8B4513 |
| BOO | #4CAF50 | #2E7D32 | #FFA000 |
| Elevate | #1E3A5F | #3498DB | #E74C3C |
| RHF | #C62828 | #4E342E | #43A047 |

### Standard Colors
| Color | Hex | Usage |
|-------|-----|-------|
| White | #FFFFFF | Backgrounds |
| Light Gray | #F4F4F4 | Email wrapper |
| Dark Gray | #333333 | Body text |
| Medium Gray | #666666 | Muted text |
| Light Border | #EEEEEE | Dividers |
| Footer BG | #333333 | Footer background |

## Email Client Support

### CSS Support Matrix

| Feature | Gmail | Outlook | Apple Mail | iOS | Android |
|---------|-------|---------|------------|-----|---------|
| Inline CSS | Yes | Yes | Yes | Yes | Yes |
| `<style>` tag | Partial | Yes | Yes | Yes | Partial |
| Media queries | No | No | Yes | Yes | Partial |
| Web fonts | No | No | Yes | Yes | No |
| Background images | Partial | No | Yes | Yes | Yes |
| Border-radius | Yes | No | Yes | Yes | Yes |
| Flexbox | No | No | Yes | Yes | No |
| CSS Grid | No | No | Yes | Partial | No |

### Outlook-Specific Considerations
```html
<!-- Use VML for backgrounds in Outlook -->
<!--[if gte mso 9]>
<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
<v:fill type="tile" src="image.jpg" />
<v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
<![endif]-->

<!-- Your content -->

<!--[if gte mso 9]>
</v:textbox>
</v:rect>
<![endif]-->
```

## Template Structure

### Required Elements
1. DOCTYPE declaration
2. HTML lang attribute
3. Meta charset UTF-8
4. Meta viewport for mobile
5. Title tag
6. Preheader text (hidden)
7. Table-based layout
8. Unsubscribe link
9. Physical address (CAN-SPAM)

### Recommended Structure
```
<html>
  <head>
    <meta charset="utf-8">
    <meta viewport>
    <title>
    <!--[if mso]> conditional styles <![endif]-->
  </head>
  <body>
    <div> <!-- Preheader (hidden) --> </div>
    <table> <!-- Email wrapper -->
      <tr><td>
        <table> <!-- Main container 600px -->
          <tr> <!-- Header --> </tr>
          <tr> <!-- Hero/Banner --> </tr>
          <tr> <!-- Main content --> </tr>
          <tr> <!-- CTA --> </tr>
          <tr> <!-- Footer --> </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
```

## Best Practices

### Images
- Always include alt text
- Use absolute URLs (https://)
- Keep file size < 100KB per image
- Total email size < 102KB for Gmail clipping
- Avoid single-image emails

### Links
- Use full URLs (not relative)
- Include UTM parameters for tracking
- Make links touch-friendly (44px minimum)
- Use descriptive link text

### Accessibility
- Maintain 4.5:1 color contrast ratio
- Use semantic table roles
- Include alt text for all images
- Don't rely solely on color

### Testing
- Test in Litmus or Email on Acid
- Send test emails to multiple providers
- Check on mobile devices
- Verify links work
- Validate HTML

## Variable Reference

### Standard Variables
```
{{first_name}} - Recipient first name
{{last_name}} - Recipient last name
{{email}} - Recipient email
{{unsubscribe_url}} - Unsubscribe link
{{view_in_browser_url}} - Web version
```

### Brand Variables (Auto-populated)
```
{{brand_name}} - Business name
{{brand_logo}} - Logo URL
{{primary_color}} - Brand primary color
{{secondary_color}} - Brand secondary color
{{website_url}} - Website URL
{{social_instagram}} - Instagram URL
{{social_facebook}} - Facebook URL
```

### Campaign Variables
```
{{discount_code}} - Discount code
{{discount_percent}} - Discount percentage
{{expiry_date}} - Offer expiry date
{{product_name}} - Featured product
{{product_url}} - Product link
{{product_image}} - Product image URL
```
