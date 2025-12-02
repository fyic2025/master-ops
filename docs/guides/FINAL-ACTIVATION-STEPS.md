# ✅ N8N WORKFLOW READY - FINAL ACTIVATION (1 Minute)

## Current Status

### ✅ COMPLETED
- Workflow imported successfully: `Smartlead → HubSpot Outreach Tracking (FIXED)`
- Workflow ID: `0pogf2zEuEcRup83`
- All 17 nodes configured
- **All 12 credentials properly assigned (0 missing)**
- Webhook URL configured: `https://automation.growthcohq.com/webhook/smartlead-webhook`

### ⏳ MANUAL ACTION REQUIRED (1 click)

The n8n API doesn't allow programmatic activation. You need to activate manually.

---

## Activation Steps (30 seconds)

### 1. Open Workflow

Click this URL:
```
https://automation.growthcohq.com/workflow/0pogf2zEuEcRup83
```

### 2. Activate

- Top-right corner: Find the toggle switch that says **"Inactive"**
- Click it once
- It should change to **"Active"** with a green indicator

### 3. Verify

You should see:
- ✅ Green "Active" toggle in top-right
- ✅ Webhook URL displayed: `https://automation.growthcohq.com/webhook/smartlead-webhook`

---

## ✅ Done!

Your workflow is now live and ready to sync SmartLead events to HubSpot.

## Next Step: Create SmartLead Campaign

Once activated, proceed to create the SmartLead campaign using:

**Guide**: [ONE-CAMPAIGN-SETUP.md](ONE-CAMPAIGN-SETUP.md)

**CSV File**: `beauty_blast_2025_ALL_LEADS.csv` (2,200 leads ready)

**Webhook URL** (for SmartLead campaign settings):
```
https://automation.growthcohq.com/webhook/smartlead-webhook
```

---

## Verification Scripts

To verify the workflow status anytime, run:
```bash
cd master-ops
npx tsx check-n8n-workflow.ts
```

This will show:
- Workflow name and ID
- Active/Inactive status
- Number of nodes
- Credential configuration status
- Webhook URL
