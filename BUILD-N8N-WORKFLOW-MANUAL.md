# Build SmartLead → HubSpot Workflow in n8n (5 Minutes)

Forget importing - just build it fresh in the UI.

## Step 1: Create New Workflow

1. Go to: https://automation.growthcohq.com
2. Click **"+ New workflow"**
3. Name it: `SmartLead to HubSpot Sync`

## Step 2: Add Webhook Trigger

1. Click **"+"** to add node
2. Search: **"Webhook"**
3. Click **"Webhook"**
4. Configure:
   - **HTTP Method**: POST
   - **Path**: `smartlead-webhook`
   - **Respond**: On Received
5. Click **"Execute Node"** to get the webhook URL
6. Copy the URL (should be: `https://automation.growthcohq.com/webhook/smartlead-webhook`)

## Step 3: Add HubSpot Search Node

1. Click **"+"** after webhook node
2. Search: **"HTTP Request"**
3. Configure:
   - **Method**: POST
   - **URL**: `https://api.hubapi.com/crm/v3/objects/contacts/search`
   - **Authentication**: Generic Credential Type → HTTP Header Auth
   - **Credential**: Select **"HubSpot API"** (or create it)
   - **Body**: JSON
   - **JSON Body**:
   ```json
   {
     "filterGroups": [{
       "filters": [{
         "propertyName": "email",
         "operator": "EQ",
         "value": "{{ $json.lead_email }}"
       }]
     }]
   }
   ```

## Step 4: Add Create Contact Node (If Not Found)

1. Click **"+"** after search node
2. Search: **"HTTP Request"**
3. Configure:
   - **Method**: POST
   - **URL**: `https://api.hubapi.com/crm/v3/objects/contacts`
   - **Authentication**: Generic Credential Type → HTTP Header Auth
   - **Credential**: Select **"HubSpot API"**
   - **Body**: JSON
   - **JSON Body**:
   ```json
   {
     "properties": {
       "email": "{{ $json.lead_email }}",
       "firstname": "{{ $json.lead_first_name }}",
       "lastname": "{{ $json.lead_last_name }}"
     }
   }
   ```

## Step 5: Save and Activate

1. Click **"Save"** (top right)
2. Toggle **"Inactive" → "Active"**

## Step 6: Test Webhook

Your webhook URL is ready:
```
https://automation.growthcohq.com/webhook/smartlead-webhook
```

Test it with curl:
```bash
curl -X POST https://automation.growthcohq.com/webhook/smartlead-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "EMAIL_SENT",
    "lead_email": "test@example.com",
    "lead_first_name": "Test",
    "lead_last_name": "User"
  }'
```

Check HubSpot to see if contact was created.

---

## HubSpot Credential Setup (If Missing)

If you don't have "HubSpot API" credential:

1. In n8n, click **"Credentials"** (left menu)
2. Click **"+ Add Credential"**
3. Search: **"HTTP Header Auth"**
4. Configure:
   - **Name**: `HubSpot API`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer pat-ap1-afc56dc7-ad2b-48bf-bd11-61bd28670e45`
5. Click **"Create"**

---

## Done!

This creates a basic workflow that:
- ✅ Receives SmartLead webhooks
- ✅ Searches for contact in HubSpot by email
- ✅ Creates contact if not found

You can add more nodes later for tracking opens, clicks, etc.

But this gets you started with a working foundation.
