# Fix Workflow Credentials (2 Minutes)

When you open the workflow, some nodes may show as **red** or have credential warnings. This is because the imported workflow has placeholder credential IDs that don't match your n8n instance.

## Quick Fix Steps

### 1. Open Workflow
https://automation.growthcohq.com/workflow/0pogf2zEuEcRup83

### 2. Identify Red/Invalid Nodes

Look for nodes with:
- Red border
- Warning icon
- "Credential not set" message

### 3. Fix Each Node

Click on each red node and assign the correct credential:

#### HubSpot Nodes (10 nodes):
These nodes need **"HubSpot API"** credential:
- Search HubSpot by Email
- Create HubSpot Contact
- Fetch Current Email Count
- Fetch Current Open Count
- Fetch Current Click Count
- Update: Email Sent
- Update: Email Opened
- Update: Link Clicked
- Update: Email Reply
- Update: Unsubscribed

**How to fix:**
1. Click the node
2. Find "Credential to connect with" dropdown
3. Select **"HubSpot API"**
4. Node should turn from red to white/gray

#### Supabase Nodes (2 nodes):
These nodes need **"Supabase"** credential:
- Check HubSpot Contact
- Log to Supabase

**How to fix:**
1. Click the node
2. Find "Credential to connect with" dropdown
3. Select **"Supabase"**
4. Node should turn from red to white/gray

### 4. Save Workflow

Click **"Save"** button (top right)

### 5. Activate Workflow

Toggle **"Inactive"** → **"Active"** (top right switch)

---

## Expected Result

After fixing credentials:
- ✅ All nodes show white/gray (no red)
- ✅ No credential warnings
- ✅ "Active" toggle is green
- ✅ Webhook URL visible: `https://automation.growthcohq.com/webhook/smartlead-webhook`

---

## If Credentials Don't Exist

If you don't see "HubSpot API" or "Supabase" in the dropdown:

### Create HubSpot API Credential
1. Click "+ New Credential" in the dropdown
2. Search for: **"HTTP Header Auth"**
3. Configure:
   ```
   Name: HubSpot API
   Header Name: Authorization
   Header Value: Bearer pat-ap1-afc56dc7-ad2b-48bf-bd11-61bd28670e45
   ```
4. Click "Create"

### Create Supabase Credential
1. Click "+ New Credential" in the dropdown
2. Search for: **"Postgres"**
3. Configure:
   ```
   Name: Supabase
   Host: db.qcvfxxsnqvdfmpbcgdni.supabase.co
   Database: postgres
   User: postgres
   Password: CP7YqHhY5BP2ToNt
   Port: 5432
   SSL: require
   ```
4. Click "Create"

---

## Quick Verification

After activation, run this to verify:
```bash
cd master-ops
npx tsx check-n8n-workflow.ts
```

Should show:
- Status: ✅ ACTIVE
- Nodes with credentials: 12
- Nodes missing credentials: 0
