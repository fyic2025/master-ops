# RHF Agent Enhancement - Task List

Created: 2025-12-06
Status: In Progress

## Completed

- [x] **Document actual vault credentials** - Found 15 creds, documented in MD file
- [x] **Fix env variable naming** - Updated scripts to use `REDHILLFRESH_*` prefix
- [x] **Add WooCommerce MCP setup** - Documented in RHF MD and CLAUDE.md

## To Do - Jayson (Local Machine)

- [ ] **Add WooCommerce MCP to mcp.json** - Paste config into `C:\Users\jayso\AppData\Roaming\Code\User\mcp.json`
  ```json
  "woocommerce-rhf": {
    "command": "npx",
    "args": ["-y", "woocommerce-mcp-server"],
    "env": {
      "WC_URL": "https://redhillfresh.com.au",
      "WC_CONSUMER_KEY": "<from vault>",
      "WC_CONSUMER_SECRET": "<from vault>"
    }
  }
  ```
- [ ] **Test WooCommerce MCP** - Restart VS Code, verify tools work

## To Do - Co-Founder (Can Do Remotely)

- [ ] **Run WooCommerce data sync** - Populate Supabase with RHF data
  ```bash
  node creds.js load redhillfresh
  npx tsx red-hill-fresh/scripts/sync-woocommerce.ts --full
  ```

- [ ] **Build out priority specialist agents** with working scripts:
  1. `inventory-specialist` - Wastage tracking, stock alerts
  2. `local-seo-specialist` - GBP monitoring, review tracking
  3. `weekly-specials-designer` - Tuesday email workflow
  4. `route-optimizer` - Delivery route planning
  5. `wastage-tracker` - Produce spoilage monitoring

- [ ] **Add Supabase MCP for RHF** - Enable agents to query RHF data directly

- [ ] **Clean up duplicate vault credentials** - Test `wp_password` vs `wp_admin_password`

## Future Enhancements

- [ ] Connect Xero MCP for RHF accounting
- [ ] Add Gmail MCP for pricelist reading
- [ ] Build Google Ads MCP for RHF campaigns
- [ ] Enable cross-agent delegation (MD → Directors → Specialists)

---

## How to Check This List

```bash
# From master-ops directory
cat .claude/TASKS-rhf-agent-enhancement.md
```

Or ask: "What's on our RHF task list?"
