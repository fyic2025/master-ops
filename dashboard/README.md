# Master Ops Dashboard

Centralized operations dashboard for all businesses.

**Production:** https://ops.growthcohq.com

## Quick Start (Local Development)

```bash
cd dashboard
npm install
cp .env.example .env.local
# Add your credentials to .env.local
npm run dev
```

Open http://localhost:3000

## Business Dashboards

| Business | Route | Platform |
|----------|-------|----------|
| Home | `/home` | Overview |
| Buy Organics Online | `/boo` | BigCommerce |
| Teelixir | `/teelixir` | Shopify |
| Elevate Wholesale | `/elevate` | Shopify B2B |
| Red Hill Fresh | `/rhf` | WooCommerce |
| Brand Connections | `/brandco` | Next.js |

## Features

- **Shipping** - Order sync, label printing, manifest management
- **PPC** - Google Ads performance across accounts
- **SEO** - SEO agents, content queue, GSC data
- **Sync** - Product/customer/order sync status
- **Health** - Integration health monitoring
- **Finance** - Xero consolidation & financials

## Deployment

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete setup guide.**

Quick reference:
- Platform: DigitalOcean App Platform
- Config: `.do/app.yaml`
- Auth: NextAuth v5 + Google OAuth
- Database: Supabase

## Authentication

Google OAuth with email allowlist. Edit `src/lib/user-permissions.ts` to manage users.

Current admins:
- jayson@teelixir.com
- peter@teelixir.com
- ops@growthcohq.com

## Architecture

```
Dashboard (Next.js 14) → Supabase → Existing Integrations
```

- Reads data from Supabase (no direct API calls)
- Real-time updates via Supabase subscriptions
- All API costs handled by existing sync jobs
