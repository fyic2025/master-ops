# Master Ops Dashboard

Centralized operations dashboard for all businesses.

## Quick Start

```bash
cd dashboard
npm install
cp .env.example .env.local
# Add your Supabase credentials to .env.local
npm run dev
```

Open http://localhost:3000

## Dashboards

| Route | Purpose |
|-------|---------|
| `/` | Operations home - all businesses overview |
| `/ppc` | Google Ads performance across accounts |
| `/seo` | SEO agents, content queue, GSC data |
| `/sync` | Product/customer/order sync status |
| `/health` | Integration health monitoring |
| `/finance` | Xero consolidation & financials |
| `/settings` | API connections & configuration |

## Deployment to DigitalOcean

1. Push to GitHub
2. Connect repo to DigitalOcean App Platform
3. Use `.do/app.yaml` for configuration
4. Set environment variables in DO dashboard

Estimated cost: $5-12/month (Basic tier)

## Architecture

```
Dashboard (Next.js) → Supabase → Existing Integrations
```

- Reads data from Supabase (no direct API calls)
- Real-time updates via Supabase subscriptions
- All API costs handled by existing sync jobs

## Next Steps

1. [ ] Add Supabase credentials
2. [ ] Connect business card stats to real data
3. [ ] Wire up PPC dashboard to google_ads_* tables
4. [ ] Wire up SEO dashboard to seo_* tables
5. [ ] Add Supabase Auth for login
6. [ ] Deploy to DigitalOcean
