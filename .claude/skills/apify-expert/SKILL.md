---
name: apify-expert
description: Web scraping and lead generation using Apify actors. Manages Google Maps scraping, competitor monitoring, and business data extraction. Primary focus on B2B lead generation for Elevate Wholesale.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Apify Expert Skill

> Web scraping and lead generation using Apify actors. Primary focus on B2B leads for Elevate Wholesale.

---

## Skill Identity

**Name:** apify-expert
**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2025-12-03

---

## Capabilities

### Core Functions

1. **Lead Generation**
   - Google Maps business scraping
   - Business directory extraction
   - Contact information enrichment
   - Geographic coverage planning

2. **Actor Management**
   - Run and monitor actors
   - Schedule recurring scrapes
   - Export datasets
   - Manage API usage

3. **Usage Monitoring**
   - Track monthly spend vs $49 budget
   - Cost per lead calculation
   - Budget allocation by target market
   - Alerts when approaching limits

4. **Data Pipeline**
   - Export to Supabase
   - Deduplicate leads
   - Validate data quality
   - Feed to n8n workflows

---

## When to Use This Skill

### Activate For:
- "Scrape leads from Google Maps"
- "Get fitness businesses in Sydney"
- "Check Apify usage/spend"
- "Run Google Maps scraper"
- "Export Apify dataset"
- "How many leads can we get for $X?"
- "Lead generation for Elevate"

### Defer To:
- **n8n-workflow-manager**: Workflow automation issues
- **competitor-monitor**: Competitor analysis strategy
- **supabase-expert**: Database storage issues

---

## Account Details

| Setting | Value |
|---------|-------|
| **Username** | `elevate` |
| **Email** | jayson@fyic.com.au |
| **Plan** | $49/month |
| **Data Retention** | 31 days |
| **Credential** | `global/apify_token` in vault |

---

## Available Actors (15)

### Lead Generation (Primary)

| Actor | Cost | Use For |
|-------|------|---------|
| **Google Maps Scraper** | ~$0.007/place | Business leads with contact info |
| **Google Search Scraper** | ~$0.003/search | Business discovery |
| **Website Content Crawler** | ~$0.002/page | Contact extraction from websites |

### Social Media

| Actor | Cost | Use For |
|-------|------|---------|
| Instagram Scraper | ~$0.005/profile | Influencer/competitor research |
| Instagram Hashtag Scraper | ~$0.003/post | Trend research |
| YouTube Scraper | ~$0.005/video | Content research |
| Facebook Hashtag Scraper | ~$0.003/post | Social monitoring |

### Utilities

| Actor | Cost | Use For |
|-------|------|---------|
| Web Scraper | Variable | Custom scraping |
| Cheerio Scraper | Variable | Fast HTML parsing |
| RAG Web Browser | Variable | AI-assisted browsing |

---

## Monthly Budget Strategy ($49)

### Target Markets for Elevate Wholesale

| Market | Search Terms | Budget | Expected Leads |
|--------|--------------|--------|----------------|
| Fitness/Wellness | gyms, personal trainers, yoga studios | $15 | ~2,100 |
| Health Food Retail | health food stores, organic shops | $12 | ~1,700 |
| Cafes/Restaurants | organic cafes, smoothie bars | $10 | ~1,400 |
| Practitioners | naturopaths, nutritionists | $8 | ~1,100 |
| Buffer | Ad-hoc requests | $4 | ~500 |
| **TOTAL** | | **$49** | **~6,800/month** |

### Geographic Coverage

**Priority Order:**
1. Sydney Metro + NSW
2. Melbourne Metro + VIC
3. Brisbane Metro + QLD
4. Perth, Adelaide, Hobart
5. Regional towns > 10,000 population

---

## API Quick Reference

### Authentication

```bash
# Get token from vault
export APIFY_TOKEN=$(node creds.js get global apify_token)

# Or use in code
const token = await creds.get('global', 'apify_token')
```

### Common API Calls

```typescript
// Base URL
const APIFY_BASE = 'https://api.apify.com/v2'

// Headers
const headers = {
  'Authorization': `Bearer ${process.env.APIFY_TOKEN}`,
  'Content-Type': 'application/json'
}

// Check usage
GET /users/me/limits

// Run actor
POST /acts/{actorId}/runs

// Get run status
GET /actor-runs/{runId}

// Get dataset
GET /datasets/{datasetId}/items

// List actors
GET /acts?limit=50
```

### Run Google Maps Scraper

```typescript
const response = await fetch(
  'https://api.apify.com/v2/acts/compass~crawler-google-places/runs',
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      searchStringsArray: ['gyms Sydney Australia'],
      maxCrawledPlacesPerSearch: 100,
      language: 'en',
      includeContactInfo: true,
      includeWebsite: true
    })
  }
)
```

---

## Lead Data Schema

```typescript
interface ApifyLead {
  // Core fields
  business_name: string
  business_type: string

  // Location
  address: string
  city: string
  state: string
  postcode: string

  // Contact
  phone: string
  website: string
  email: string | null

  // Google data
  google_rating: number
  review_count: number
  google_place_id: string

  // Metadata
  scraped_at: string
  source_actor: string
  search_query: string
}
```

---

## n8n Integration

### Credential Setup (Manual in n8n UI)

1. Go to: https://automation.growthcohq.com
2. Settings → Credentials → Add Credential
3. Type: **HTTP Header Auth**
4. Name: `Apify API Token`
5. Header Name: `Authorization`
6. Header Value: `Bearer [token from vault]`

### Workflow Pattern

```
Trigger (Cron/Webhook)
    ↓
HTTP Request → Apify Run Actor
    ↓
Wait Node (poll for completion)
    ↓
HTTP Request → Get Dataset
    ↓
Code Node → Transform/Validate
    ↓
Supabase → Store Leads
    ↓
(Optional) Email → Send Report
```

---

## Key Scripts

| Script | Purpose |
|--------|---------|
| `scripts/apify-client.ts` | TypeScript API client |
| `scripts/check-usage.ts` | Check monthly spend |
| `scripts/run-google-maps.ts` | Run Google Maps scraper |
| `scripts/export-dataset.ts` | Export and save results |

---

## Skill Documentation

| Document | Purpose |
|----------|---------|
| `SKILL.md` | This file - main documentation |
| `QUICK-REFERENCE.md` | Common commands |
| `context/ACTORS-INVENTORY.md` | All actors with costs |
| `context/USAGE-TRACKING.md` | Monthly budget tracking |
| `playbooks/GOOGLE-MAPS-SCRAPING.md` | Lead gen workflow |

---

## Supabase Tables

### apify_usage_log
Tracks API usage and costs.

```sql
CREATE TABLE apify_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  run_id TEXT NOT NULL,
  results_count INTEGER,
  cost_usd DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### wholesale_lead_queue
Stores scraped leads for processing.

```sql
-- Already exists in elevate-wholesale schema
-- Leads are inserted here after scraping
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Monthly spend | $40-49 (utilize budget) |
| Leads per month | 6,000+ |
| Cost per lead | < $0.01 |
| Data quality | > 90% valid |
| Geographic coverage | All AU metros |

---

## Troubleshooting

### "Actor run failed"
1. Check Apify console for error details
2. Verify input parameters
3. Check if actor is deprecated

### "No results returned"
1. Verify search terms are correct
2. Check geographic scope
3. Try broader search terms

### "Over budget"
1. Check current spend: `scripts/check-usage.ts`
2. Pause scheduled runs
3. Prioritize high-value targets

---

**Skill Level:** Expert (Level 3)
**Confidence:** 95%
