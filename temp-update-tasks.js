const fs = require('fs');
const path = 'c:/Users/jayso/master-ops/.claude/TASKS.md';
let content = fs.readFileSync(path, 'utf8');

const notes = `

---

## Health Check Monitoring Notes

**Status:** Live on ops.growthcohq.com/home/health (2025-12-04)

**New Integrations Added:**
| Integration | Business | Status | Notes |
|-------------|----------|--------|-------|
| Smartlead | Global | Degraded | API returning non-200 |
| n8n | Global | Healthy | Automation platform |
| GSC | Global | Degraded | Missing GOOGLE_CLIENT_ID/SECRET |
| Gmail (GSuite) | Teelixir | Healthy | OAuth via vault |
| Google Merchant | BOO | Degraded | Missing Google OAuth creds |
| Teelixir Shopify | Teelixir | Healthy | Store access |
| RHF WooCommerce | RHF | Degraded | Missing RHF_WOO_CONSUMER_SECRET |

**Files Modified:**
- \`shared/libs/integrations/health/sync-health-checks.js\` - Added new integration checks
- \`dashboard/src/app/(dashboard)/[business]/health/page.tsx\` - Added integration/business name mappings
- \`dashboard/src/components/IntegrationStatus.tsx\` - Added integration name mappings

**To Fix Degraded Integrations:**
1. **GSC & Google Merchant**: Add \`GOOGLE_CLIENT_ID\` and \`GOOGLE_CLIENT_SECRET\` to .env
2. **RHF WooCommerce**: Add \`RHF_WOO_CONSUMER_SECRET\` to .env (get from vault)
3. **Smartlead**: Check if API key is valid

**Run Health Checks Manually:**
\`\`\`bash
node shared/libs/integrations/health/sync-health-checks.js
\`\`\`

**Git Commit:** a87798d
`;

// Insert before the session logs
const sessionStart = content.indexOf('### Session 24d5e364');
if (sessionStart > 0) {
  content = content.slice(0, sessionStart) + notes + '\n' + content.slice(sessionStart);
  fs.writeFileSync(path, content);
  console.log('Added health check notes to TASKS.md');
} else {
  console.log('Could not find session marker');
}
