# Pending Tasks

> **Last Updated:** 2025-11-25
> **Purpose:** Track tasks that need manual completion when pulling this repo locally

---

## HIGH PRIORITY

### 1. Klaviyo Integration Setup
**Status:** BLOCKED - Awaiting Private API Key
**Priority:** HIGH
**Assigned:** Manual completion required

#### What's Needed
- [ ] Obtain Klaviyo **Private API Key** for each account:
  - [ ] Teelixir/Elevate Klaviyo account
  - [ ] Buy Organics Online Klaviyo account (if separate)

#### How to Get the Key
1. Login to Klaviyo → **Account** → **Settings** → **API Keys**
2. Click **Create Private API Key**
3. Name it: `master-ops-integration`
4. Select scopes: `Read-only` for profiles, segments, campaigns, metrics
5. Copy the key (starts with `pk_` for public or full access key)

#### Where to Add
Add to `MASTER-CREDENTIALS-COMPLETE.env`:
```bash
# Klaviyo - Teelixir/Elevate
KLAVIYO_TEELIXIR_API_KEY=<private-api-key-here>

# Klaviyo - Buy Organics Online (if separate account)
KLAVIYO_BOO_API_KEY=<private-api-key-here>
```

#### What This Enables
Once credentials are added:
- Sync Klaviyo profiles to Supabase
- Track engagement metrics (opens, clicks, purchases)
- Identify unengaged subscribers for reactivation
- Campaign performance analytics
- Automated list health monitoring

#### Schema Ready
The Supabase schema is prepared at:
- `infra/supabase/schema-klaviyo-sync.sql`

#### Related Files
- `.env.template` - Credential placeholders added
- `infra/supabase/schema-klaviyo-sync.sql` - Database schema
- `STATUS.md` - Phase 3 blocked on this

---

## MEDIUM PRIORITY

### 2. AWS Credentials (Optional)
**Status:** SKIPPED - Not required for new system
**Priority:** MEDIUM

Only needed if you want to:
- Export old RDS data
- Clean up old EC2 instances

---

### 3. Slack Webhooks (Optional)
**Status:** NOT CONFIGURED
**Priority:** LOW

For fancy alerts. Email alerts work without this.

---

## Completed Recently

- [x] Supabase database setup (BOO, Teelixir, Elevate)
- [x] BigCommerce API credentials
- [x] HubSpot integration
- [x] Smartlead integration
- [x] n8n workflow automation
- [x] Email notifications

---

## How to Check Task Status

```bash
# Quick status check
grep -E "^\- \[ \]" TASKS-PENDING.md

# Or check STATUS.md for phase overview
cat STATUS.md | head -50
```

---

## Notes

When you complete a task:
1. Check the box: `- [x]`
2. Move to "Completed Recently" section
3. Update `STATUS.md` if it affects a phase
4. Commit changes
