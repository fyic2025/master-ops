# Evening Google Ads Briefing

Run the evening Google Ads briefing for all 3 businesses.

## Steps

1. **Pull yesterday's performance summary** from Supabase:
   - Query `get_google_ads_yesterday_summary()` function
   - Get spend, revenue, ROAS for each business
   - Calculate day-over-day changes

2. **Check for active alerts**:
   - Query `v_google_ads_active_alerts` view
   - Prioritize by severity (critical > warning > info)
   - Group by business

3. **Get pending optimization opportunities**:
   - Query `v_google_ads_pending_opportunities` view
   - Present top 3 by priority and potential impact
   - Ask for approval on actionable items

4. **Review wasteful search terms**:
   - Query `v_google_ads_search_terms_attention` view
   - Highlight terms with spend > $10 and 0 conversions
   - Suggest adding as negatives

5. **Present conversationally** following the evening-briefing.md prompt guide

6. **Ask for direction**:
   - What should I focus on tonight/tomorrow?
   - Any deep dives needed?
   - Spawn agents for specific tasks

## Required Data

If Supabase data isn't available yet, inform the user:
"I don't have performance data synced yet. Want me to run a sync first?"

## Tone

- Conversational, friendly
- Lead with headlines
- Be direct about issues
- End with clear next steps
