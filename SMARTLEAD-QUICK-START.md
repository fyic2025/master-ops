# Smartlead Integration - Quick Start

**Time to Deploy:** 30 minutes
**Status:** ✅ Ready

---

## TL;DR

**Problem:** Email counters in HubSpot always show `1` instead of accumulating.

**Solution:** Fixed n8n workflow that fetches current value before incrementing.

**Status:** All code ready, validated with real data (23 campaigns, 1,075 leads).

---

## Deploy in 4 Steps

### 1. Pre-Check (2 min)
```bash
cd /root/master-ops
./scripts/pre-deploy-check.sh
```
Expected: `✅ ALL CHECKS PASSED`

### 2. Import Workflow (10 min)
- Login: `https://automation.growthcohq.com`
- Import: `infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json`
- Configure HubSpot API credential
- Configure Supabase credential

### 3. Test (10 min)
```bash
# Send test webhook
curl -X POST https://automation.growthcohq.com/webhook/smartlead-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "EMAIL_OPEN",
    "lead_email": "test@example.com",
    "campaign_id": "test-123",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# Check HubSpot: email_open_count should = 1

# Send again
curl -X POST https://automation.growthcohq.com/webhook/smartlead-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "EMAIL_OPEN",
    "lead_email": "test@example.com",
    "campaign_id": "test-123",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# Check HubSpot: email_open_count should = 2 ✅
```

### 4. Activate (8 min)
- Toggle workflow **Active**
- Update Smartlead webhook URL
- Monitor first 10 events
- Done! ✅

---

## What Gets Fixed

**Before:**
```
Event 1 → HubSpot shows: 1 open
Event 2 → HubSpot shows: 1 open ❌
Event 3 → HubSpot shows: 1 open ❌
```

**After:**
```
Event 1 → HubSpot shows: 1 open ✓
Event 2 → HubSpot shows: 2 opens ✓
Event 3 → HubSpot shows: 3 opens ✓
```

---

## Files Overview

```
📄 Quick Start → SMARTLEAD-QUICK-START.md (this file)
📄 Full README → SMARTLEAD-README.md
📄 Visual Fix Explanation → COUNTER-FIX-SUMMARY.md
📄 Step-by-Step Deploy → DEPLOY-FIXED-WORKFLOW.md
📄 Validation Results → SMARTLEAD-VALIDATION-REPORT.md
📄 Technical Analysis → SMARTLEAD-METRICS-ANALYSIS.md

📦 Workflow (deploy this) → infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json
```

---

## Validation Results

✅ **23 campaigns** discovered
✅ **1,075 leads** with full data
✅ **10 email accounts** configured
✅ **2.9% reply rate** (31 replies)
✅ **API connected** and working
✅ **All types validated** against real API

---

## Need More Detail?

**Understanding the Problem:**
→ [COUNTER-FIX-SUMMARY.md](COUNTER-FIX-SUMMARY.md) - Visual explanation (5 min)

**Deploying:**
→ [DEPLOY-FIXED-WORKFLOW.md](DEPLOY-FIXED-WORKFLOW.md) - Full deployment guide (read while deploying)

**Validation:**
→ [SMARTLEAD-VALIDATION-REPORT.md](SMARTLEAD-VALIDATION-REPORT.md) - What data exists (10 min)

**Technical Deep-Dive:**
→ [SMARTLEAD-METRICS-ANALYSIS.md](SMARTLEAD-METRICS-ANALYSIS.md) - Root cause analysis (10 min)

---

## Pre-Deployment Checklist

```
□ .env has SMARTLEAD_API_KEY
□ .env has HUBSPOT_ACCESS_TOKEN
□ .env has SUPABASE credentials
□ Workflow file exists and is valid JSON
□ Pre-deploy check script passes
□ n8n credentials configured
□ Test webhook ready
```

Run: `./scripts/pre-deploy-check.sh` to verify all ✅

---

## After Deployment

**New Capabilities:**
- ✅ Accurate engagement counters
- ✅ Lead segmentation by activity
- ✅ Trend analysis over time
- ✅ Reliable reporting metrics

**What Changes:**
- Counters will start at 1 and increment properly
- Historical data before fix will remain at 1
- New events will accumulate correctly
- Can rebuild counters from Supabase if needed

---

## Quick Commands

```bash
# Check everything is ready
./scripts/pre-deploy-check.sh

# Test API connection
npx tsx test-smartlead.ts

# Full validation
npx tsx test-smartlead-full.ts

# View validation results
cat SMARTLEAD-VALIDATION-REPORT.md
```

---

## Support

**Workflow not working?**
→ Check [DEPLOY-FIXED-WORKFLOW.md](DEPLOY-FIXED-WORKFLOW.md) troubleshooting section

**Counters not incrementing?**
→ Verify "Fetch" nodes execute before "Update" nodes in n8n

**API connection issues?**
→ Run `./scripts/pre-deploy-check.sh` to diagnose

---

**Ready?** → Start with [COUNTER-FIX-SUMMARY.md](COUNTER-FIX-SUMMARY.md)

**Just deploy?** → Follow [DEPLOY-FIXED-WORKFLOW.md](DEPLOY-FIXED-WORKFLOW.md)

---

Last Updated: November 21, 2025
