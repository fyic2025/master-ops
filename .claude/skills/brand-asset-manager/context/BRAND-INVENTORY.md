# Brand Inventory

Complete inventory of brand assets, colors, fonts, and identity elements across all 4 businesses.

## Teelixir

### Identity
- **Business Name**: Teelixir
- **Tagline**: Unlock Your Full Potential
- **Industry**: Functional Mushrooms & Adaptogens
- **Platform**: Shopify

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary (Forest Green) | #1B4D3E | Headers, buttons, links |
| Secondary (Gold) | #D4AF37 | Accents, highlights, badges |
| Accent (Earth Brown) | #8B4513 | Secondary elements |
| Background | #FFFFFF | Page backgrounds |
| Text | #333333 | Body text |
| Muted | #666666 | Secondary text |

### Typography
| Element | Font | Fallback |
|---------|------|----------|
| Headings | Playfair Display | Georgia, serif |
| Body | Lato | Arial, sans-serif |

### Logo Variants Needed
- [ ] `logo_primary` - Full color horizontal logo
- [ ] `logo_white` - White version for dark backgrounds
- [ ] `logo_dark` - Dark version for light backgrounds
- [ ] `logo_icon` - Square mushroom icon

### Email Settings
- **From Name**: Teelixir
- **From Email**: colette@teelixir.com
- **Website**: https://teelixir.com

---

## Buy Organics Online (BOO)

### Identity
- **Business Name**: Buy Organics Online
- **Tagline**: Your Wellness Journey Starts Here
- **Industry**: Organic Health Products
- **Platform**: BigCommerce

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary (Organic Green) | #4CAF50 | Headers, buttons |
| Secondary (Dark Green) | #2E7D32 | Accents, hover states |
| Accent (Amber) | #FFA000 | Highlights, sale badges |
| Background | #FFFFFF | Page backgrounds |
| Text | #333333 | Body text |

### Typography
| Element | Font | Fallback |
|---------|------|----------|
| Headings | Arial | Helvetica, sans-serif |
| Body | Arial | Helvetica, sans-serif |

### Logo Variants Needed
- [ ] `logo_primary` - Full BOO logo
- [ ] `logo_white` - White version
- [ ] `logo_icon` - Leaf/organic icon

### Email Settings
- **From Name**: Buy Organics Online
- **From Email**: sales@buyorganicsonline.com.au
- **Website**: https://www.buyorganicsonline.com.au

---

## Elevate Wholesale

### Identity
- **Business Name**: Elevate Wholesale
- **Tagline**: Elevate Your Retail Business
- **Industry**: B2B Wholesale Distribution
- **Platform**: Shopify

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary (Navy Blue) | #1E3A5F | Headers, buttons |
| Secondary (Sky Blue) | #3498DB | Accents, links |
| Accent (Red) | #E74C3C | Alerts, important notices |
| Background | #FFFFFF | Page backgrounds |
| Text | #333333 | Body text |

### Typography
| Element | Font | Fallback |
|---------|------|----------|
| Headings | Arial | Helvetica, sans-serif |
| Body | Arial | Helvetica, sans-serif |

### Logo Variants Needed
- [ ] `logo_primary` - Full Elevate logo
- [ ] `logo_white` - White version
- [ ] `logo_icon` - E icon

### Email Settings
- **From Name**: Elevate Wholesale
- **From Email**: wholesale@elevatewholesale.com.au
- **Website**: https://elevatewholesale.com.au

---

## Red Hill Fresh (RHF)

### Identity
- **Business Name**: Red Hill Fresh
- **Tagline**: Fresh From the Peninsula
- **Industry**: Local Fresh Produce & Groceries
- **Platform**: WooCommerce

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary (Fresh Red) | #C62828 | Headers, accents |
| Secondary (Earth Brown) | #4E342E | Secondary elements |
| Accent (Fresh Green) | #43A047 | Fresh/organic indicators |
| Background | #FFFFFF | Page backgrounds |
| Text | #333333 | Body text |

### Typography
| Element | Font | Fallback |
|---------|------|----------|
| Headings | Arial | Helvetica, sans-serif |
| Body | Arial | Helvetica, sans-serif |

### Logo Variants Needed
- [ ] `logo_primary` - Full RHF logo
- [ ] `logo_white` - White version
- [ ] `logo_icon` - Leaf/produce icon

### Email Settings
- **From Name**: Red Hill Fresh
- **From Email**: hello@redhillfresh.com.au
- **Website**: https://redhillfresh.com.au

---

## Asset Storage Structure

```
supabase-storage/brand-assets/
├── brands/
│   ├── teelixir/
│   │   ├── logo_primary/
│   │   ├── logo_white/
│   │   ├── logo_dark/
│   │   ├── logo_icon/
│   │   ├── email_header/
│   │   └── email_footer/
│   ├── boo/
│   │   └── ...
│   ├── elevate/
│   │   └── ...
│   └── rhf/
│       └── ...
```

## Asset Requirements

### Logo Files
- Format: PNG (with transparency) or SVG
- Minimum width: 600px for primary
- Icon size: 512x512px minimum
- Provide @2x versions for retina

### Email Assets
- Header: 600px wide (standard email width)
- Footer: 600px wide
- Format: PNG or JPG (no SVG for email)
- Optimize: <100KB per image

### Social Assets
- Profile: 400x400px
- Cover: 1500x500px (Twitter), 820x312px (Facebook)
- Format: PNG or JPG
