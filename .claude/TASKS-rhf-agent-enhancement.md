# RHF Agent Enhancement - Task List

Created: 2025-12-06
Updated: 2025-12-06
Status: In Progress

## Completed ✅

### Infrastructure
- [x] **Document actual vault credentials** - Found 15 creds, documented in RHF MD file
- [x] **Fix env variable naming** - Updated scripts to use `REDHILLFRESH_*` prefix
- [x] **Add WooCommerce MCP setup** - Documented in RHF MD and CLAUDE.md

### Gmail Pricelist System
- [x] **Gmail pricelist reader script** - `red-hill-fresh/scripts/gmail-pricelist-reader.ts`
  - Reads from eatfresh@redhillfresh.com.au
  - Parses Excel attachments from 4 suppliers (POH, Melba, OGG, BDM)
  - Auto-categorizes produce and detects organic products
- [x] **Dashboard API endpoint** - `/api/rhf/sync/pricelist` (POST trigger, GET status)
- [x] **n8n workflow** - `infra/n8n-workflows/rhf/rhf-pricelist-sync.json`
  - Scheduled Mon/Thu 6AM AEST
  - Auto-triggers before ordering window

### Weekly Ordering System
- [x] **Weekly orders API** - `/api/rhf/weekly-orders`
  - GET: suppliers, boxes, orders, products by supplier
  - POST: create/update orders with line items
  - PATCH: update order status (draft → submitted)

### Database Schema
- [x] **Core tables created**: rhf_suppliers, rhf_pricelists, rhf_supplier_products, rhf_boxes, rhf_weekly_orders, rhf_order_lines, rhf_gmail_sync_log
- [x] **Unit conversion system** - supplier_unit_kg, cost_per_sell_unit, margin_percent columns
- [x] **Default weights table** - rhf_unit_weights with common produce (banana 13kg box, apple 18kg, etc.)
- [x] **Cost calculation view** - rhf_product_costs for margin analysis

---

## To Do - Jayson (Local Machine)

- [ ] **Add WooCommerce MCP to mcp.json** - Paste config into `C:\Users\jayso\AppData\Roaming\Code\User\mcp.json`
  ```json
  "woocommerce-rhf": {
    "command": "npx",
    "args": ["-y", "woocommerce-mcp-server"],
    "env": {
      "WC_URL": "https://redhillfresh.com.au",
      "WC_CONSUMER_KEY": "<run: node creds.js get redhillfresh wc_consumer_key>",
      "WC_CONSUMER_SECRET": "<run: node creds.js get redhillfresh wc_consumer_secret>"
    }
  }
  ```
- [ ] **Test WooCommerce MCP** - Restart VS Code, verify tools work

---

## To Do - Co-Founder (Remote Tasks)

### High Priority
- [ ] **Activate n8n workflow** - The `rhf-pricelist-sync` workflow is saved but `"active": false`
  - Login to n8n and enable it
- [ ] **Run initial WooCommerce sync** - Populate Supabase with RHF products/orders/customers
  ```bash
  node creds.js load redhillfresh
  npx tsx red-hill-fresh/scripts/sync-woocommerce.ts --full
  ```

### Database Migrations
- [ ] **Run combined migration** - Execute `infra/supabase/migrations/COMBINED_20251206_all_pending.sql`
  - Includes: BOO checkout health, stock fix queue, dashboard pages, RHF unit conversion

### Specialist Agents
- [ ] **Build priority specialist agents** with working scripts:
  1. `inventory-specialist` - Wastage tracking, stock alerts, quality_days monitoring
  2. `local-seo-specialist` - GBP monitoring, review tracking
  3. `weekly-specials-designer` - Tuesday email workflow
  4. `route-optimizer` - Delivery route planning
  5. `wastage-tracker` - Produce spoilage monitoring

### Data Quality
- [ ] **Add Supabase MCP for RHF** - Enable agents to query RHF data directly
- [ ] **Clean up duplicate vault credentials** - Test `wp_password` vs `wp_admin_password`
- [ ] **Populate rhf_suppliers table** - Add the 4 suppliers (poh, melba, ogg, bdm) with details

---

## Future Enhancements

- [ ] Connect Xero MCP for RHF accounting
- [ ] Build Google Ads MCP for RHF campaigns
- [ ] Enable cross-agent delegation (MD → Directors → Specialists)
- [ ] Build weekly specials email template (Klaviyo or custom)
- [ ] Add delivery zone optimization based on rhf_shipping_zones

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `.claude/agents/rhf/md.md` | RHF Managing Director agent config |
| `red-hill-fresh/scripts/gmail-pricelist-reader.ts` | Gmail → Excel → Supabase |
| `red-hill-fresh/scripts/sync-woocommerce.ts` | WooCommerce data sync |
| `dashboard/src/app/api/rhf/sync/pricelist/route.ts` | Pricelist sync API |
| `dashboard/src/app/api/rhf/weekly-orders/route.ts` | Weekly ordering API |
| `infra/n8n-workflows/rhf/rhf-pricelist-sync.json` | n8n scheduled workflow |
| `infra/supabase/migrations/COMBINED_20251206_all_pending.sql` | Pending DB migrations |

---

## How to Check This List

```bash
cat .claude/TASKS-rhf-agent-enhancement.md
```

Or ask: "What's on our RHF task list?"
