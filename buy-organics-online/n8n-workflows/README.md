# n8n Workflows - Buy Organics Online

## Setup Instructions

### Option 1: n8n Cloud (Recommended - $20/month)
1. Go to: https://n8n.io/cloud/
2. Sign up for n8n Cloud
3. Create new workflows by importing the JSON files below

### Option 2: Self-Hosted (Save money - $12/month VPS)
1. Use Digital Ocean / AWS / Hetzner VPS
2. Install n8n: `npx n8n`
3. Or use Docker: `docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n`

## Required Credentials in n8n

Before importing workflows, set up these credentials:

### 1. BigCommerce API
- **Name:** `BigCommerce - BOO`
- **Type:** Custom API
- **Store Hash:** See `MASTER-CREDENTIALS-COMPLETE.env` → `BOO_BC_STORE_HASH`
- **Client ID:** See `MASTER-CREDENTIALS-COMPLETE.env` → `BOO_BC_CLIENT_ID`
- **Access Token:** See `MASTER-CREDENTIALS-COMPLETE.env` → `BOO_BC_ACCESS_TOKEN`

### 2. Supabase
- **Name:** `Supabase - BOO`
- **Type:** Supabase
- **Host:** See `MASTER-CREDENTIALS-COMPLETE.env` → `BOO_SUPABASE_URL`
- **Service Role Key:** See `MASTER-CREDENTIALS-COMPLETE.env` → `BOO_SUPABASE_SERVICE_ROLE_KEY`

### 3. Oborne FTP
- **Name:** `FTP - Oborne`
- **Type:** FTP
- **Host:** See `MASTER-CREDENTIALS-COMPLETE.env` → `OBORNE_FTP_HOST`
- **Port:** `21`
- **Username:** See `MASTER-CREDENTIALS-COMPLETE.env` → `OBORNE_FTP_USER`
- **Password:** See `MASTER-CREDENTIALS-COMPLETE.env` → `OBORNE_FTP_PASS`

### 4. HTTP (for UHP and Kadac)
- No special credentials needed (public URLs)

## Workflows to Import

1. **01-bigcommerce-product-sync.json** - Daily BC → Supabase sync
2. **02-oborne-supplier-sync.json** - Every 2 hours
3. **03-uhp-supplier-sync.json** - Every 2 hours
4. **04-kadac-supplier-sync.json** - Every 2 hours
5. **05-product-linking.json** - Manual trigger (after supplier syncs)

## Import Instructions

1. Open n8n dashboard
2. Click "Add Workflow" → "Import from File"
3. Select JSON file
4. Configure credentials for each node
5. Activate workflow

## Monitoring

All workflows log to `automation_logs` table in Supabase:
```sql
SELECT * FROM automation_logs ORDER BY started_at DESC LIMIT 20;
```

## Troubleshooting

**Workflow fails:**
- Check `automation_logs` table for error details
- Verify credentials are correct
- Check API rate limits (BigCommerce: 20k requests/hour)

**No data syncing:**
- Manually trigger workflow to test
- Check node execution logs in n8n UI
- Verify Supabase tables exist

**Slow performance:**
- Reduce batch sizes in loop nodes
- Add delays between API calls
- Consider upgrading n8n instance
