# GA4 Property Setup

## Buy Organics Online (BOO)

**Property ID:** Set via GA4_BOO_PROPERTY_ID
**Platform:** BigCommerce
**Data Stream:** Web

### Enhanced E-commerce Events
| Event | Status | Implementation |
|-------|--------|----------------|
| view_item | Active | BigCommerce native |
| add_to_cart | Active | BigCommerce native |
| remove_from_cart | Active | BigCommerce native |
| view_cart | Active | BigCommerce native |
| begin_checkout | Active | BigCommerce native |
| add_payment_info | Active | BigCommerce native |
| add_shipping_info | Active | BigCommerce native |
| purchase | Active | BigCommerce native |

### Custom Events
| Event | Purpose | Trigger |
|-------|---------|---------|
| newsletter_signup | Email capture | Form submission |
| search | Site search | Search execution |
| quick_view | Product quick view | Modal open |

### Conversions Configured
- purchase (Primary)
- add_to_cart
- begin_checkout
- newsletter_signup

### Audiences
- All Users
- Purchasers (last 30 days)
- Cart Abandoners
- High Value Customers (>$200 order)
- Repeat Customers (2+ purchases)

---

## Teelixir

**Property ID:** Set via GA4_TEELIXIR_PROPERTY_ID
**Platform:** Shopify
**Data Stream:** Web

### Enhanced E-commerce Events
| Event | Status | Implementation |
|-------|--------|----------------|
| view_item | Active | Shopify native |
| add_to_cart | Active | Shopify native |
| remove_from_cart | Active | Shopify native |
| view_cart | Active | Shopify native |
| begin_checkout | Active | Shopify native |
| add_payment_info | Active | Shopify native |
| purchase | Active | Shopify native |

### Custom Events
| Event | Purpose | Trigger |
|-------|---------|---------|
| newsletter_signup | Klaviyo signup | Form submission |
| ambassador_apply | Ambassador program | Application submit |
| blog_read | Blog engagement | Scroll >75% |
| video_play | Product videos | Video start |

### Conversions Configured
- purchase (Primary)
- add_to_cart
- begin_checkout
- newsletter_signup
- ambassador_apply

### Audiences
- All Users
- Purchasers
- Blog Readers
- Ambassador Leads
- Returning Visitors
- Mobile Users

---

## Elevate Wholesale

**Property ID:** Set via GA4_ELEVATE_PROPERTY_ID
**Platform:** Shopify
**Data Stream:** Web

### Enhanced E-commerce Events
| Event | Status | Implementation |
|-------|--------|----------------|
| view_item | Active | Shopify native |
| add_to_cart | Active | Shopify native |
| begin_checkout | Active | Shopify native |
| purchase | Active | Shopify native |

### Custom Events
| Event | Purpose | Trigger |
|-------|---------|---------|
| trial_signup | Trial registration | Account created |
| login | Account login | Successful login |
| catalog_download | PDF download | Download click |

### Conversions Configured
- purchase (Primary)
- trial_signup
- login (First login)

### Audiences
- All Users
- Trial Users
- Active Customers
- Logged In Users

---

## Red Hill Fresh (RHF)

**Property ID:** Set via GA4_RHF_PROPERTY_ID
**Platform:** WooCommerce
**Data Stream:** Web

### Enhanced E-commerce Events
| Event | Status | Implementation |
|-------|--------|----------------|
| view_item | Active | WooCommerce + GTM |
| add_to_cart | Active | WooCommerce + GTM |
| remove_from_cart | Active | WooCommerce + GTM |
| view_cart | Active | WooCommerce + GTM |
| begin_checkout | Active | WooCommerce + GTM |
| purchase | Active | WooCommerce + GTM |

### Custom Events
| Event | Purpose | Trigger |
|-------|---------|---------|
| newsletter_signup | Email capture | Form submit |
| contact_form | Contact requests | Form submit |

### Conversions Configured
- purchase (Primary)
- add_to_cart
- begin_checkout
- newsletter_signup

### Audiences
- All Users
- Purchasers
- Cart Abandoners
- Local Visitors (VIC)

---

## Cross-Property Configuration

### User ID Tracking
All properties configured with User-ID for cross-device tracking:
- BOO: BigCommerce customer ID
- Teelixir: Shopify customer ID
- Elevate: Shopify customer ID
- RHF: WooCommerce user ID

### Google Signals
Enabled on all properties for:
- Demographics
- Interests
- Cross-device reporting

### Data Retention
- Event data: 14 months
- User data: 14 months

### Filters
- Internal traffic filtered (office IP)
- Developer traffic filtered (UTM param)

---

## UTM Conventions

### Standard Parameters
| Parameter | Format | Example |
|-----------|--------|---------|
| utm_source | platform | google, facebook, klaviyo |
| utm_medium | type | cpc, email, social |
| utm_campaign | campaign_name | spring_sale_2024 |
| utm_content | creative | banner_a, text_link |
| utm_term | keyword | mushroom_powder |

### Campaign Naming
```
{business}_{type}_{name}_{date}
Example: tlx_email_blackfriday_202411
```

### Source/Medium Standards
| Traffic Type | Source | Medium |
|--------------|--------|--------|
| Google Ads | google | cpc |
| Facebook Ads | facebook | paid_social |
| Instagram Ads | instagram | paid_social |
| Klaviyo Email | klaviyo | email |
| Newsletter | newsletter | email |
| Organic Social | facebook/instagram | organic_social |

---

## Data Quality Checklist

### Daily Checks
- [ ] Data flowing (sessions > 0)
- [ ] E-commerce events firing
- [ ] Conversion tracking working
- [ ] No sampling issues

### Weekly Checks
- [ ] Compare GA4 to platform data
- [ ] Review conversion accuracy
- [ ] Check for tracking gaps

### Monthly Checks
- [ ] Audit event implementations
- [ ] Review audience definitions
- [ ] Validate conversion values
- [ ] Check cross-property consistency
