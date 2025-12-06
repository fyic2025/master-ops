# Skills Registry (54 Skills)

**Last Updated:** 2025-12-05

Use this registry to identify applicable skills before starting ANY task.

---

## Quick Skill Finder

| Task Type | Primary Skills | Supporting Skills |
|-----------|---------------|-------------------|
| **Email Campaign** | email-campaign-manager, klaviyo-expert | email-copywriter, email-template-designer, email-preview-tester |
| **Product Updates** | bigcommerce-expert, shopify-expert, woocommerce-expert | product-description-generator, supabase-expert |
| **Landing Page** | landing-page-builder, frontend-design | brand-asset-manager, marketing-copywriter, canvas-design |
| **Analytics Report** | ga4-analyst, gsc-expert, marketing-analytics-reporter | supabase-expert |
| **Customer Segments** | customer-segmentation-engine, customer-churn-predictor | klaviyo-expert, email-campaign-manager |
| **Ad Creation** | ad-copy-generator, google-ads-manager | brand-asset-manager, marketing-copywriter |
| **Social Media** | social-post-creator, social-creative-generator | brand-asset-manager, canvas-design |
| **Document Processing** | pdf, xlsx, docx, pptx | - |
| **Database Work** | supabase-expert | integration-tester |
| **Automation** | n8n-workflow-manager, webhook-event-router | dashboard-automation |
| **Lead Generation** | apify-expert | supabase-expert, email-campaign-manager |
| **UI/UX Design** | frontend-design, canvas-design, web-artifacts-builder | brand-guidelines, theme-factory |
| **Dashboard Page Analysis** | frontend-design, webapp-testing | supabase-expert, + page-specific skills |

---

## Dashboard Page Analysis (Mandatory Skills)

**When working on ANY dashboard page task, you MUST:**

1. Query `dashboard_pages` table for the page's `skills_required` field
2. Activate ALL listed skills using `/skill <name>`
3. Log `skills_used` in any analysis records

### Default Skills for Page Analysis

If `skills_required` is empty, use these defaults:
- `frontend-design` - UX/layout analysis
- `webapp-testing` - Quality checks
- `supabase-expert` - Data patterns

### Page Category → Required Skills

| Category | Default Skills |
|----------|---------------|
| operations | frontend-design, supabase-expert, stock-alert-predictor |
| marketing | frontend-design, google-ads-manager, gsc-expert |
| finance | frontend-design, supabase-expert |
| automation | frontend-design, n8n-workflow-manager, klaviyo-expert |
| integrations | frontend-design, supabase-expert, integration-tester |
| customers | frontend-design, shopify-expert, customer-segmentation-engine |

### Example

```
Analyzing: /:business/stock page

1. Query skills_required → ['frontend-design', 'supabase-expert', 'stock-alert-predictor']

2. Activate skills:
   /skill frontend-design
   /skill supabase-expert
   /skill stock-alert-predictor

3. Perform analysis using all skill methodologies

4. Log skills_used: ['frontend-design', 'supabase-expert', 'stock-alert-predictor']
```

---

## Skills by Category

### E-Commerce Platforms (3)
| Skill | Platform | Use When |
|-------|----------|----------|
| `bigcommerce-expert` | BOO | Products, orders, inventory, API operations |
| `shopify-expert` | Teelixir, Elevate | Products, orders, metafields, themes |
| `woocommerce-expert` | Red Hill Fresh | Products, orders, WordPress integration |

### Email & Marketing Automation (5)
| Skill | Use When |
|-------|----------|
| `email-campaign-manager` | Creating, sending, managing campaigns (Smartlead, Klaviyo, Gmail) |
| `email-template-designer` | Creating/editing HTML email templates |
| `email-copywriter` | Writing subject lines, body copy, CTAs |
| `email-preview-tester` | Testing email rendering across clients |
| `klaviyo-expert` | Klaviyo flows, segments, campaigns, A/B tests |

### Analytics & SEO (6)
| Skill | Use When |
|-------|----------|
| `google-ads-manager` | Google Ads campaigns, bidding, ROAS |
| `ga4-analyst` | Website traffic, conversions, user behavior |
| `gsc-expert` | Search rankings, indexing, crawl issues |
| `seo-performance-monitor` | Core Web Vitals, technical SEO |
| `seo-content-writer` | Blog posts, landing pages, category descriptions |
| `marketing-analytics-reporter` | Cross-channel performance reports |

### Content Creation (6)
| Skill | Use When |
|-------|----------|
| `brand-asset-manager` | Brand colors, fonts, logos, voice guidelines |
| `marketing-copywriter` | Headlines, subject lines, CTAs, ad copy |
| `product-description-generator` | Product descriptions, SEO copy |
| `ad-copy-generator` | Google Ads, Meta Ads, display ad copy |
| `social-post-creator` | Social captions, hashtags, scheduling |
| `social-creative-generator` | Instagram, Facebook, TikTok content |

### Design & Frontend (7)
| Skill | Use When |
|-------|----------|
| `frontend-design` | Distinctive UI, bold typography, animations |
| `canvas-design` | Museum-quality visual art (PNG/PDF) |
| `brand-guidelines` | Brand identity systems |
| `theme-factory` | Theme styling |
| `web-artifacts-builder` | React + Tailwind + shadcn/ui components |
| `landing-page-builder` | Campaign landing pages, lead gen pages |
| `algorithmic-art` | Generative art patterns |

### Customer Intelligence (4)
| Skill | Use When |
|-------|----------|
| `customer-segmentation-engine` | RFM analysis, customer segments |
| `customer-churn-predictor` | At-risk customers, retention campaigns |
| `competitor-monitor` | Competitive analysis, pricing intelligence |
| `review-reputation-manager` | Google reviews, product reviews |

### Conversion & Optimization (4)
| Skill | Use When |
|-------|----------|
| `conversion-optimizer` | A/B testing, statistical analysis, CRO |
| `pricing-optimizer` | Margin analysis, competitive pricing |
| `website-speed-optimizer` | Page speed, Core Web Vitals, Lighthouse |
| `product-image-enhancer` | Image optimization, Cloudinary, alt-text |

### Inventory & Fulfillment (3)
| Skill | Use When |
|-------|----------|
| `stock-alert-predictor` | Stock monitoring, supplier alerts |
| `supplier-performance-scorecard` | Supplier reliability, sync quality |
| `shipping-optimizer` | Shipping rates, carrier selection, zones |

### Infrastructure & Automation (6)
| Skill | Use When |
|-------|----------|
| `supabase-expert` | Database queries, migrations, RLS |
| `n8n-workflow-manager` | Automation workflows, n8n troubleshooting |
| `apify-expert` | Web scraping, Google Maps leads |
| `webhook-event-router` | Webhook handling, event routing |
| `integration-tester` | API testing, connection validation |
| `dashboard-automation` | Dashboard metrics, alerts, reports |

### Document Processing (4)
| Skill | Use When |
|-------|----------|
| `pdf` | PDF processing, extraction, creation |
| `xlsx` | Excel file operations with formulas |
| `docx` | Word document processing |
| `pptx` | PowerPoint processing |

### Development Tools (6)
| Skill | Use When |
|-------|----------|
| `mcp-builder` | Build MCP servers |
| `skill-creator` | Create new skills |
| `webapp-testing` | Web app testing |
| `doc-coauthoring` | Document collaboration |
| `internal-comms` | Internal communications |
| `slack-gif-creator` | Slack GIF creation |

---

## Skill Activation Checklist

Before starting ANY task, ask:

- [ ] Does this involve a **platform**? (bigcommerce, shopify, woocommerce)
- [ ] Does this involve **email**? (campaign-manager, template-designer, copywriter, klaviyo)
- [ ] Does this involve **data/database**? (supabase-expert)
- [ ] Does this involve **analytics**? (ga4-analyst, gsc-expert, google-ads-manager)
- [ ] Does this involve **content**? (copywriter, description-generator, seo-content-writer)
- [ ] Does this involve **automation**? (n8n-workflow-manager, webhook-event-router)
- [ ] Does this involve **customers**? (segmentation-engine, churn-predictor)
- [ ] Does this involve **design/UI**? (frontend-design, canvas-design, web-artifacts-builder)
- [ ] Does this involve **documents**? (pdf, xlsx, docx, pptx)
- [ ] Does this involve **web scraping**? (apify-expert)

---

## How to Use Skills

```
# Activate a skill before starting work
Use the Skill tool: skill-name

# Example workflow
1. Review this registry
2. Identify applicable skills
3. Activate skills using Skill tool
4. Follow skill methodology
5. Complete task
```
