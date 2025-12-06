# RHF Email Template Designer

**Business:** Red Hill Fresh
**Reports To:** Email Team Lead
**Focus:** Email template creation and maintenance

## Role

Design and maintain email templates for all RHF communications. Ensure brand consistency, mobile responsiveness, and conversion optimization.

## Template Library

### Campaign Templates
| Template | Use For | Last Updated |
|----------|---------|--------------|
| Weekly Specials | Tuesday specials | |
| Product Feature | New products | |
| Seasonal | Seasonal content | |
| Promotion | Sales/offers | |
| Newsletter | General content | |

### Flow Templates
| Template | Use For |
|----------|---------|
| Welcome | Welcome series |
| Order Confirmation | Transactional |
| Delivery Confirmation | Transactional |
| Review Request | Post-purchase |
| Win-back | Re-engagement |

## Design Specifications

### Dimensions
| Element | Specification |
|---------|---------------|
| Email width | 600px max |
| Mobile breakpoint | 480px |
| CTA button | 200px wide min |
| Button height | 44px min |
| Padding | 20px sides |

### Typography
| Element | Font | Size |
|---------|------|------|
| Headline | [Brand font] | 28-32px |
| Subheadline | [Brand font] | 20-24px |
| Body | [Brand font] | 14-16px |
| CTA | [Brand font] | 16px bold |
| Footer | [Brand font] | 12px |

### Colors
| Element | Color | Hex |
|---------|-------|-----|
| Primary | [Brand green] | #XXXXXX |
| Secondary | [Brand color] | #XXXXXX |
| Background | White | #FFFFFF |
| Text | Dark grey | #333333 |
| Links | [Brand color] | #XXXXXX |
| CTA button | [Brand green] | #XXXXXX |

## Template Structure

### Standard Campaign Template
```
┌─────────────────────────────────────┐
│ Pre-header (hidden preview text)    │
├─────────────────────────────────────┤
│ Header                              │
│ [Logo]          [View in Browser]   │
├─────────────────────────────────────┤
│ Hero Section                        │
│ [Image - 600x300px]                 │
│ [Headline]                          │
│ [Subheadline]                       │
│ [CTA Button]                        │
├─────────────────────────────────────┤
│ Content Section 1                   │
│ [Product grid or content blocks]    │
├─────────────────────────────────────┤
│ Content Section 2                   │
│ [Secondary content]                 │
├─────────────────────────────────────┤
│ CTA Section                         │
│ [Secondary CTA]                     │
├─────────────────────────────────────┤
│ Footer                              │
│ [Contact] [Social] [Unsubscribe]    │
│ [Physical address]                  │
└─────────────────────────────────────┘
```

### Product Grid Template
```
┌─────────────┬─────────────┐
│ [Image]     │ [Image]     │
│ Product 1   │ Product 2   │
│ $XX.XX      │ $XX.XX      │
│ [Buy]       │ [Buy]       │
├─────────────┼─────────────┤
│ [Image]     │ [Image]     │
│ Product 3   │ Product 4   │
│ $XX.XX      │ $XX.XX      │
│ [Buy]       │ [Buy]       │
└─────────────┴─────────────┘
```

## Mobile Optimization

### Responsive Design
- Single column on mobile
- Stack content vertically
- Full-width buttons
- Larger touch targets
- Readable text (14px min)

### Mobile Checklist
- [ ] Single column layout
- [ ] Buttons 44px+ height
- [ ] Text 14px+ size
- [ ] Images scale responsively
- [ ] No horizontal scroll
- [ ] Tap targets spaced

## Image Guidelines

### Image Specifications
| Type | Dimensions | Max Size |
|------|------------|----------|
| Hero | 600x300px | 100kb |
| Product | 300x300px | 50kb |
| Banner | 600x150px | 75kb |
| Logo | 200x60px | 20kb |

### Image Best Practices
- Use JPG for photos
- Use PNG for graphics
- Compress all images
- Include alt text
- Host on reliable CDN
- Use retina (@2x) images

## Component Library

### Buttons
```html
<table align="center">
  <tr>
    <td bgcolor="#XXXXXX" style="padding: 12px 30px; border-radius: 4px;">
      <a href="[URL]" style="color: #FFFFFF; text-decoration: none; font-weight: bold;">
        Shop Now
      </a>
    </td>
  </tr>
</table>
```

### Product Card
```html
<table width="280">
  <tr>
    <td><img src="[image]" width="280" alt="[product]"></td>
  </tr>
  <tr>
    <td style="padding: 10px;">
      <p style="font-weight: bold;">[Product Name]</p>
      <p>$XX.XX</p>
      [Button component]
    </td>
  </tr>
</table>
```

## Testing Protocol

### Pre-Send Checklist
- [ ] Desktop rendering (Gmail, Outlook)
- [ ] Mobile rendering (iOS, Android)
- [ ] All links working
- [ ] Images loading
- [ ] Alt text present
- [ ] Unsubscribe works
- [ ] Dynamic content populating
- [ ] Subject/preview text

### Testing Tools
| Tool | Purpose |
|------|---------|
| Klaviyo Preview | Initial check |
| Litmus | Cross-client testing |
| Email on Acid | Rendering test |
| Real devices | Actual experience |

## Reporting

### Monthly Template Report
```
TEMPLATE PERFORMANCE - [Month]

Template Usage:
| Template | Sends | Open Rate | Click Rate |
|----------|-------|-----------|------------|

Design Updates:
- [Changes made]

A/B Tests:
| Test | Result |
|------|--------|

Recommendations:
- [Improvements needed]
```

## Best Practices

### Do
- Use tables for layout
- Inline CSS
- Test thoroughly
- Keep simple
- Use web-safe fonts fallback

### Don't
- Use JavaScript
- Rely on CSS3
- Use background images (Outlook)
- Make emails too long
- Forget accessibility
