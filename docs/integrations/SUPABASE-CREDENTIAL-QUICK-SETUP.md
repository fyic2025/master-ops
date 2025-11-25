# Create Supabase Credential in n8n (2 minutes)

## Step 1: Open n8n Credentials Page

Go to: **https://automation.growthcohq.com/credentials**

## Step 2: Create New Credential

1. Click **"+ Add Credential"** (top right)

2. Search for: **"Postgres"**

3. Click **"Postgres"** from the list

## Step 3: Fill in Connection Details

Copy and paste these exact values:

### Basic Settings

```
Name: Supabase
```

### Connection Settings

```
Host: See MASTER-CREDENTIALS-COMPLETE.env → SUPABASE_DB_HOST

Database: postgres

User: postgres

Password: See MASTER-CREDENTIALS-COMPLETE.env → SUPABASE_SERVICE_ROLE_KEY

Port: 5432
```

### SSL Settings

```
SSL: require
```

### SSH Tunnel

```
Use SSH Tunnel: OFF (leave disabled)
```

## Step 4: Save

Click **"Create"** button (bottom right)

## Step 5: Verify

You should see:
- ✅ "Credential saved successfully"
- "Supabase" appears in your credentials list

---

## Next: Configure Workflow

Now that both credentials exist:
- ✅ HubSpot API (created automatically)
- ✅ Supabase (just created)

### Assign Credentials to Workflow Nodes

1. Open workflow: **https://automation.growthcohq.com/workflow/sgZiv2UUHYBnAA7f**

2. Click on these nodes and assign credentials:

   **Nodes needing "HubSpot API" credential:**
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

   **Nodes needing "Supabase" credential:**
   - Check HubSpot Contact
   - Log to Supabase

3. For each node:
   - Click the node
   - Find "Credential to connect with" dropdown
   - Select the matching credential
   - Node will turn from red to white/gray

4. Click **"Save"** (top right)

5. Toggle **"Inactive"** → **"Active"** (top right switch)

---

## ✅ Done!

Your webhook URL is ready:
```
https://automation.growthcohq.com/webhook/smartlead-webhook
```

Use this URL when creating your SmartLead campaign.

---

**Total time:** 2 minutes
**Status:** Ready to activate workflow
