# n8n HubSpot Sync - Final Setup (5 minutes)

**Workflow Deployed:** ✅ `Smartlead → HubSpot Outreach Tracking (FIXED)`
**Workflow ID:** `sgZiv2UUHYBnAA7f`
**URL:** https://automation.growthcohq.com/workflow/sgZiv2UUHYBnAA7f

---

## ✅ Completed Automatically

- ✅ Workflow imported to n8n
- ✅ HubSpot API credential created (ID: `suX4tM5JeV5Hm0y7`)

---

## 📋 Manual Steps Required (5 minutes)

### Step 1: Create Supabase Credential

1. Go to: https://automation.growthcohq.com/credentials

2. Click **"+ Add Credential"**

3. Search for **"Postgres"**

4. Fill in Supabase connection details:
   ```
   Name: Supabase

   Host: db.qcvfxxsnqvdfmpbcgdni.supabase.co
   Database: postgres
   User: postgres
   Password: [Copy from .env: SUPABASE_SERVICE_ROLE_KEY]
   Port: 5432

   SSL Mode: require
   ```

5. Click **"Create"**

---

### Step 2: Configure Workflow Credentials

1. Open workflow: https://automation.growthcohq.com/workflow/sgZiv2UUHYBnAA7f

2. You'll see credential errors on some nodes (red warning icons)

3. For each node with credential error:

   **HubSpot API Nodes:**
   - "Search HubSpot by Email"
   - "Create HubSpot Contact"
   - "Fetch Current Email Count"
   - "Fetch Current Open Count"
   - "Fetch Current Click Count"
   - "Update: Email Sent"
   - "Update: Email Opened"
   - "Update: Link Clicked"
   - "Update: Email Reply"
   - "Update: Unsubscribed"

   Action: Click node → Select credential: **"HubSpot API"** from dropdown

   **Supabase Nodes:**
   - "Check HubSpot Contact"
   - "Log to Supabase"

   Action: Click node → Select credential: **"Supabase"** from dropdown

4. Click **"Save"** (top right)

---

### Step 3: Get Webhook URL

The workflow webhook URL is:
```
https://automation.growthcohq.com/webhook/smartlead-webhook
```

This will be used in SmartLead campaign setup.

---

### Step 4: Activate Workflow

1. Toggle **"Inactive"** → **"Active"** (top right switch)

2. Verify status shows: **"Active"** ✅

---

## 🧪 Test the Webhook (Optional)

Test that the workflow receives and processes events:

```bash
curl -X POST https://automation.growthcohq.com/webhook/smartlead-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "EMAIL_SENT",
    "campaign_id": "test-campaign",
    "campaign_name": "Test Campaign",
    "lead_id": "test-lead-123",
    "lead_email": "test@example.com",
    "lead_first_name": "Test",
    "lead_last_name": "User",
    "timestamp": "2025-11-23T00:00:00Z",
    "data": {
      "email_sequence_number": 1,
      "email_subject": "Test Subject"
    }
  }'
```

**Expected Result:**
- Workflow execution shows "Success"
- Contact created in HubSpot: test@example.com
- `outreach_email_count` = 1
- Log entry created in Supabase

---

## ✅ Verification Checklist

After setup:

- [ ] Supabase credential created
- [ ] All workflow nodes showing green (no credential errors)
- [ ] Workflow saved
- [ ] Workflow activated (switch shows "Active")
- [ ] Webhook URL copied: `https://automation.growthcohq.com/webhook/smartlead-webhook`
- [ ] Test webhook sent (optional)
- [ ] Test contact appears in HubSpot (optional)

---

## 🚀 Next Step

Once n8n workflow is activated, you're ready to:

**Create SmartLead Campaign**
Follow: [ONE-CAMPAIGN-SETUP.md](ONE-CAMPAIGN-SETUP.md)

The webhook URL to use in SmartLead:
```
https://automation.growthcohq.com/webhook/smartlead-webhook
```

---

## 🔧 Troubleshooting

### Issue: Nodes still showing credential errors

**Solution:** Make sure you selected the credential from the dropdown for ALL nodes listed above.

### Issue: Webhook returns 404

**Solution:** Verify workflow is "Active" (not just saved).

### Issue: Supabase connection fails

**Solution:**
1. Check host is correct: `db.qcvfxxsnqvdfmpbcgdni.supabase.co`
2. Verify SSL Mode is set to "require"
3. Confirm password matches `SUPABASE_SERVICE_ROLE_KEY` from .env

### Issue: HubSpot API errors

**Solution:**
1. Verify HubSpot token is valid: `pat-ap1-afc56dc7-ad2b-48bf-bd11-61bd28670e45`
2. Check token has CRM write permissions
3. Regenerate token if needed: https://app.hubspot.com/settings/

---

**Status:** ✅ Ready for manual configuration (5 minutes)
