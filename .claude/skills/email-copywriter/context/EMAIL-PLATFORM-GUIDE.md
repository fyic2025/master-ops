# Email Platform Guide

## Platform Overview

### Klaviyo (Primary)

**Used By:** BOO, Teelixir, Elevate Wholesale
**Features:**
- Advanced segmentation
- Flow automation
- A/B testing
- SMS integration
- Dynamic content
- Product feeds

**Key Capabilities:**
- Predictive analytics
- Customer lifetime value
- Product recommendations
- Back-in-stock alerts
- Review requests

### Mailchimp (Alternative)

**Used By:** Some transactional
**Features:**
- Basic segmentation
- Automation
- A/B testing
- Landing pages

### Gmail/SMTP (Transactional)

**Used By:** Order confirmations, system alerts
**Features:**
- Reliable delivery
- Simple templates
- API integration

---

## Klaviyo Specifics

### Personalization Tags

```
{{ first_name|default:"there" }}
{{ email }}
{{ organization }}

Event-based:
{{ event.ProductName }}
{{ event.ProductImageURL }}
{{ event.ItemPrice }}
{{ event.Categories }}

Profile-based:
{{ person.first_name }}
{{ person.last_name }}
{{ person.location.city }}
```

### Dynamic Blocks

```
Product Block:
{% for item in event.Items %}
  {{ item.ProductName }}
  {{ item.ImageURL }}
  {{ item.Price }}
{% endfor %}

Conditional:
{% if person.first_name %}
  Hi {{ person.first_name }},
{% else %}
  Hi there,
{% endif %}

Catalog/Recommendations:
{{ catalog_item.name }}
{{ catalog_item.images[0] }}
{{ catalog_item.url }}
```

### Segments to Target

| Segment | Definition |
|---------|------------|
| Engaged | Opened/clicked last 30 days |
| At-Risk | No activity 60-90 days |
| VIP | High CLV or frequent purchasers |
| New Subscribers | Joined last 7 days |
| Repeat Customers | 2+ purchases |
| Abandoned Cart | Cart event, no purchase |

### Flow Triggers

| Flow | Trigger | Wait |
|------|---------|------|
| Welcome | List signup | Immediate |
| Abandoned Cart | Started Checkout | 1 hour |
| Browse Abandonment | Viewed Product | 2 hours |
| Post-Purchase | Order Placed | 1 hour |
| Winback | Has not purchased | 60 days |
| Birthday | Birthday property | 0 days |

---

## Email Template Structure

### Header Section
```html
<!-- Logo + Navigation -->
<table>
  <tr>
    <td>{{ brand.logo }}</td>
  </tr>
  <tr>
    <td>Shop | New Arrivals | Sale</td>
  </tr>
</table>
```

### Hero Section
```html
<!-- Main image + headline -->
<table>
  <tr>
    <td>
      <img src="hero-image.jpg" alt="Campaign hero">
      <h1>Headline Text</h1>
      <p>Supporting copy</p>
      <a href="#">CTA Button</a>
    </td>
  </tr>
</table>
```

### Product Grid
```html
<!-- 2-3 products per row -->
<table>
  <tr>
    <td>
      <img src="product1.jpg">
      <h3>Product Name</h3>
      <p>$XX.XX</p>
    </td>
    <td>
      <img src="product2.jpg">
      <h3>Product Name</h3>
      <p>$XX.XX</p>
    </td>
  </tr>
</table>
```

### Footer Section
```html
<!-- Social + Legal -->
<table>
  <tr>
    <td>Follow us: [Social Icons]</td>
  </tr>
  <tr>
    <td>
      {{ organization.address }}
      <a href="{{ unsubscribe_url }}">Unsubscribe</a>
      <a href="{{ manage_preferences_url }}">Preferences</a>
    </td>
  </tr>
</table>
```

---

## Email Design Best Practices

### Width & Layout
- Max width: 600px
- Single column for mobile
- 2-3 columns for products
- Plenty of white space

### Images
- Max width: 600px
- Compress to <200KB
- Always include alt text
- Retina: 2x resolution

### Fonts
- Web-safe fallbacks
- Body: 14-16px
- Headlines: 22-28px
- Line height: 1.5

### Buttons
- Min size: 44x44px (mobile tappable)
- Contrasting colors
- Clear white space
- Action text

### Mobile Optimization
- Single column
- Large tap targets
- Readable without zooming
- Stack images vertically

---

## Deliverability Tips

### Sender Reputation
- Consistent from name
- Authenticated domain (SPF, DKIM, DMARC)
- Clean list hygiene
- Engagement-based sending

### Content Best Practices
```
Avoid:
- ALL CAPS
- Excessive punctuation!!!
- Spam trigger words (free, act now, limited time)
- Too many images (maintain text:image ratio)
- Large file sizes

Include:
- Plain text version
- Alt text on images
- Clear unsubscribe
- Physical address
```

### List Hygiene
- Remove hard bounces immediately
- Suppress unsubscribes
- Sunset unengaged (90+ days no open)
- Verify new subscribers

---

## Testing Checklist

### Before Send
```
Content:
[ ] Subject line finalized
[ ] Preview text complete
[ ] Copy proofread
[ ] Links tested (all work)
[ ] Images loading
[ ] Alt text on images
[ ] Personalization working

Technical:
[ ] Mobile preview checked
[ ] Dark mode tested
[ ] Multiple clients tested
[ ] Plain text version
[ ] UTM parameters on links
[ ] From name correct
[ ] Reply-to configured

Compliance:
[ ] Unsubscribe link
[ ] Physical address
[ ] Consent verified
```

### Testing Tools
- Litmus (email previews)
- Email on Acid
- Klaviyo preview
- Send test to multiple clients

---

## Analytics & Tracking

### Key Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Open Rate | Opens / Delivered | 20%+ |
| Click Rate | Clicks / Delivered | 3%+ |
| CTOR | Clicks / Opens | 10%+ |
| Conversion | Orders / Delivered | 2%+ |
| Unsubscribe | Unsubs / Delivered | <0.2% |
| Bounce | Bounces / Sent | <2% |

### UTM Parameters

```
utm_source=klaviyo
utm_medium=email
utm_campaign=[campaign-name]
utm_content=[cta-or-link-name]
```

### Attribution Window
- Klaviyo: 5 days post-click, 5 days post-open
- GA4: Last-click attribution
- Consider multi-touch for full picture

---

## Integration Points

### E-commerce Platforms

**BigCommerce (BOO):**
- Order sync
- Product catalog
- Customer data
- Cart events

**Shopify (Teelixir):**
- Native Klaviyo integration
- Real-time event sync
- Product recommendations
- Customer events

**WooCommerce (RHF):**
- Plugin-based integration
- Order data
- Customer sync

### Data Flows

```
Customer Actions → Klaviyo Events → Flows/Campaigns → Analytics
     ↑                    ↓
E-commerce Platform    Supabase (logging)
```

---

## Troubleshooting

### Low Open Rates
1. Test subject lines
2. Check send time
3. Verify deliverability
4. Clean list
5. Segment engaged users

### Low Click Rates
1. Improve CTA placement
2. Test CTA copy
3. Simplify design
4. More relevant content
5. Mobile optimization

### High Unsubscribes
1. Reduce frequency
2. Better segmentation
3. More relevant content
4. Preference center
5. Check for issues

### Deliverability Issues
1. Check authentication
2. Review content
3. Verify sender reputation
4. Clean list
5. Warm IP gradually
