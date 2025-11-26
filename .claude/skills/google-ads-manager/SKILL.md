---
name: google-ads-manager
description: AI-powered Google Ads management for Buy Organics Online (BigCommerce), Teelixir (Shopify), and Red Hill Fresh (WooCommerce). Provides evening briefings, performance analysis, optimization recommendations, and agent task delegation. Use for campaign analysis, bid optimization, search term mining, ad copy generation, and Merchant Center monitoring.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Google Ads Manager Skill

AI-powered Google Ads team for managing campaigns across 3 businesses.

## When to Activate This Skill

Activate when the user mentions:
- "ads briefing" or "evening briefing"
- "check ads performance"
- "google ads" or "ad performance"
- "campaign analysis"
- "roas" or "return on ad spend"
- "search terms" or "negative keywords"
- "merchant center" or "shopping feed"
- "bid optimization"
- "spawn ads agent"
- "what's happening with ads"

## Businesses Managed

| Business | Platform | Account Type |
|----------|----------|--------------|
| Buy Organics Online (BOO) | BigCommerce | Google Ads + Merchant Center |
| Teelixir | Shopify | Google Ads + Merchant Center |
| Red Hill Fresh (RHF) | WooCommerce | Google Ads + Merchant Center |

## Core Capabilities

### 1. Evening Briefing
Conversational review of daily performance:
- Summary of spend, revenue, ROAS across all businesses
- Comparison to yesterday and 7-day average
- Active alerts and anomalies
- Pending optimization opportunities
- Task delegation for tomorrow

### 2. Performance Analysis
Deep-dive analysis of campaigns, keywords, and search terms:
- Campaign performance trends
- Keyword quality score issues
- Wasteful search terms (high spend, no conversions)
- Budget utilization and pacing
- Cross-business benchmarking

### 3. Optimization Recommendations
AI-discovered opportunities stored in Supabase:
- Budget increase opportunities (ROAS > target, budget capped)
- Negative keyword suggestions
- Bid adjustment recommendations
- Quality score improvement priorities
- Merchant Center feed fixes

### 4. Agent Task Delegation
Spawn specialized agents for specific tasks:
- Search Term Analyzer - Mine for negatives and expansions
- Bid Optimizer - Adjust bids within guardrails
- Feed Manager - Fix Merchant Center issues
- Ad Copy Writer - Generate ad variations (future)

## Database Schema

Data is stored in Supabase for historical analysis:

**Core Tables:**
- `google_ads_accounts` - Account config per business
- `google_ads_campaign_metrics` - Daily campaign performance
- `google_ads_keyword_metrics` - Keyword performance + quality scores
- `google_ads_search_terms` - Search term data

**AI Tables:**
- `google_ads_opportunities` - Discovered optimizations
- `google_ads_alerts` - Anomaly alerts
- `google_ads_agent_tasks` - Spawned agent tracking

**Key Views:**
- `v_google_ads_business_comparison` - Cross-business metrics
- `v_google_ads_daily_totals` - Daily summaries
- `v_google_ads_pending_opportunities` - Actionable opportunities
- `v_google_ads_active_alerts` - Current alerts
- `v_google_ads_search_terms_attention` - Wasteful search terms

## Integration Libraries

```typescript
// Google Ads connector
import { GoogleAdsConnector, googleAdsBoo } from '@/shared/libs/integrations/google-ads'

// Merchant Center connector
import { GoogleMerchantConnector, merchantBoo } from '@/shared/libs/integrations/google-merchant'

// Sync service
import { GoogleAdsSyncService, syncAllBusinesses } from '@/shared/libs/integrations/google-ads'
```

## Task Execution Methodology

### For Evening Briefing

1. **Query yesterday's summary:**
   ```sql
   SELECT * FROM get_google_ads_yesterday_summary();
   ```

2. **Check active alerts:**
   ```sql
   SELECT * FROM v_google_ads_active_alerts ORDER BY severity, created_at DESC;
   ```

3. **Get pending opportunities:**
   ```sql
   SELECT * FROM v_google_ads_pending_opportunities;
   ```

4. **Present conversationally:**
   - "Across all three stores yesterday, you spent $X and generated $Y revenue..."
   - "BOO had the best ROAS at X.X, while Teelixir is X% below target..."
   - "I found 3 opportunities worth reviewing..."

5. **Ask for direction:**
   - "Would you like me to investigate any of these further?"
   - "Should I spawn a Search Term Analyzer for Teelixir?"

### For Performance Analysis

1. **Identify analysis scope:**
   - Specific business or all three?
   - Date range (default: last 7 days)
   - Focus area (campaigns, keywords, search terms)

2. **Pull relevant data from Supabase:**
   ```sql
   SELECT * FROM v_google_ads_daily_totals
   WHERE business = 'boo' AND date >= CURRENT_DATE - 7;
   ```

3. **Calculate trends:**
   - Week-over-week changes
   - Day-of-week patterns
   - Campaign-level breakdown

4. **Identify issues:**
   - Keywords with QS < 5
   - Search terms with high spend, no conversions
   - Budget-capped campaigns with good ROAS

5. **Present findings with actionable recommendations**

### For Agent Task Spawning

1. **Parse user request:**
   - What type of task? (analysis, optimization, reporting)
   - Which business(es)?
   - Any specific parameters?

2. **Log task in database:**
   ```sql
   INSERT INTO google_ads_agent_tasks
   (account_id, agent_type, objective, parameters, status)
   VALUES (...);
   ```

3. **Execute task or schedule for later:**
   - Immediate: Run analysis now
   - Scheduled: Queue for overnight processing

4. **Report back when complete:**
   - Update task status
   - Store findings
   - Flag for next briefing if significant

## Guardrails

### Budget Limits (AUD/day)
- BOO: $500 max daily spend
- Teelixir: $200 max daily spend
- Red Hill Fresh: $100 max daily spend

### Bid Adjustment Limits
- Maximum single adjustment: 20%
- Requires approval for larger changes

### Automation Thresholds
- Auto-add negative keyword: Confidence > 90%
- Auto-pause keyword: Never (requires approval)
- Budget changes > $50/day: Requires approval

## Reference Files

### Integration Code
- [shared/libs/integrations/google-ads/client.ts](../../../shared/libs/integrations/google-ads/client.ts)
- [shared/libs/integrations/google-ads/sync-service.ts](../../../shared/libs/integrations/google-ads/sync-service.ts)
- [shared/libs/integrations/google-merchant/client.ts](../../../shared/libs/integrations/google-merchant/client.ts)

### Database Schema
- [infra/supabase/migrations/20251126_google_ads_schema.sql](../../../infra/supabase/migrations/20251126_google_ads_schema.sql)

### Prompts
- [prompts/evening-briefing.md](prompts/evening-briefing.md)
- [prompts/search-term-analyzer.md](prompts/search-term-analyzer.md)

## Environment Variables Required

```bash
# Shared (OAuth2 - same for all accounts)
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=

# Buy Organics Online
GOOGLE_ADS_BOO_CUSTOMER_ID=
GOOGLE_ADS_BOO_REFRESH_TOKEN=
GMC_BOO_MERCHANT_ID=

# Teelixir
GOOGLE_ADS_TEELIXIR_CUSTOMER_ID=
GOOGLE_ADS_TEELIXIR_REFRESH_TOKEN=
GMC_TEELIXIR_MERCHANT_ID=

# Red Hill Fresh
GOOGLE_ADS_RHF_CUSTOMER_ID=
GOOGLE_ADS_RHF_REFRESH_TOKEN=
GMC_RHF_MERCHANT_ID=

# Supabase
BOO_SUPABASE_URL=
BOO_SUPABASE_SERVICE_ROLE_KEY=
```

## Success Criteria

A successful Google Ads management session should:
- Provide clear performance summaries with comparisons
- Surface actionable optimization opportunities
- Track all changes in database for audit
- Respect budget guardrails
- Enable user to delegate tasks naturally
- Report back on spawned agent results
