# Google Ads Manager - Quick Reference

## Test Commands

```bash
# Evening briefing (all businesses)
npx tsx .claude/skills/google-ads-manager/scripts/evening-briefing.ts

# Single business briefing
npx tsx .claude/skills/google-ads-manager/scripts/evening-briefing.ts --business boo

# Search term analysis
npx tsx .claude/skills/google-ads-manager/scripts/search-term-analyzer.ts --business teelixir --days 30

# Export search terms to CSV
npx tsx .claude/skills/google-ads-manager/scripts/search-term-analyzer.ts --business boo --export
```

## Business Accounts

| Business | Account ID Env Var | Target ROAS | Daily Budget |
|----------|-------------------|-------------|--------------|
| BOO | `BOO_GOOGLE_ADS_ACCOUNT_ID` | 4.0x | $150 |
| Teelixir | `TEELIXIR_GOOGLE_ADS_ACCOUNT_ID` | 3.5x | $100 |
| RHF | `RHF_GOOGLE_ADS_ACCOUNT_ID` | 3.0x | $50 |

## Key Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| ROAS | > 4x | 2-4x | < 2x |
| CTR | > 3% | 1-3% | < 1% |
| CPC | < $1.50 | $1.50-3 | > $3 |
| Conv Rate | > 3% | 1-3% | < 1% |

## Common Tasks

### Daily Routine
1. Run evening briefing at 6 PM AEST
2. Review alerts for ROAS/spend issues
3. Check for new negative keyword candidates
4. Review top performers for budget increases

### Weekly Tasks
1. Full search term analysis (30 days)
2. Add winning terms as exact match keywords
3. Add losers as negative keywords
4. Review campaign structure

## Database Tables

- `google_ads_performance` - Daily campaign metrics
- `google_ads_search_terms` - Search term reports
- `google_ads_briefings` - Stored briefings
- `google_ads_search_term_analysis` - Analysis history

## Alert Thresholds

- **ROAS Alert**: Below 80% of target
- **Overspend Alert**: >110% of daily budget
- **Underspend Alert**: <50% of daily budget
- **Zero Conversion Alert**: >50 clicks, 0 conversions
