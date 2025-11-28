/**
 * Sync Monthly P&L from Xero to Supabase
 * Stores monthly snapshots for Teelixir + Elevate
 *
 * Usage:
 *   node sync-monthly-pnl.js           # Sync current month + last month
 *   node sync-monthly-pnl.js --months 12  # Backfill last 12 months
 *   node sync-monthly-pnl.js --year 2024  # Sync all of 2024
 */
const fs = require('fs');

// Load env
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const XERO_CONFIGS = {
  teelixir: {
    clientId: env.XERO_TEELIXIR_CLIENT_ID,
    clientSecret: env.XERO_TEELIXIR_CLIENT_SECRET,
    refreshToken: env.XERO_TEELIXIR_REFRESH_TOKEN,
    tenantId: env.XERO_TEELIXIR_TENANT_ID,
    envKey: 'XERO_TEELIXIR_REFRESH_TOKEN'
  },
  elevate: {
    clientId: env.XERO_ELEVATE_CLIENT_ID,
    clientSecret: env.XERO_ELEVATE_CLIENT_SECRET,
    refreshToken: env.XERO_ELEVATE_REFRESH_TOKEN,
    tenantId: env.XERO_ELEVATE_TENANT_ID,
    envKey: 'XERO_ELEVATE_REFRESH_TOKEN'
  }
};

function saveRefreshToken(envKey, newToken) {
  try {
    let content = fs.readFileSync('.env', 'utf-8');
    const regex = new RegExp(`^${envKey}=.*$`, 'm');
    content = regex.test(content)
      ? content.replace(regex, `${envKey}=${newToken}`)
      : content + `\n${envKey}=${newToken}`;
    fs.writeFileSync('.env', content);
    // Also update in-memory
    env[envKey] = newToken;
  } catch (e) { /* ignore */ }
}

async function getToken(config) {
  const creds = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=refresh_token&refresh_token=${config.refreshToken}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(data));
  if (data.refresh_token) {
    saveRefreshToken(config.envKey, data.refresh_token);
    config.refreshToken = data.refresh_token;
  }
  return data.access_token;
}

async function getXeroPnL(token, tenantId, fromDate, toDate) {
  const url = `https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss?fromDate=${fromDate}&toDate=${toDate}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'xero-tenant-id': tenantId,
      'Accept': 'application/json'
    }
  });
  const data = await res.json();
  return data.Reports?.[0] || null;
}

function parsePnLReport(report) {
  if (!report?.Rows) return null;

  const result = {
    revenue: 0,
    cogs: 0,
    gross_profit: 0,
    operating_expenses: 0,
    net_profit: 0,
    income_accounts: [],
    cogs_accounts: [],
    expense_accounts: []
  };

  for (const section of report.Rows) {
    if (section.RowType === 'Section' && section.Title) {
      const title = section.Title.toLowerCase();
      const accounts = [];
      let sectionTotal = 0;

      for (const row of section.Rows || []) {
        if (row.RowType === 'Row' && row.Cells) {
          const name = row.Cells[0]?.Value || '';
          const amount = parseFloat(row.Cells[1]?.Value) || 0;
          accounts.push({ name, amount });
          sectionTotal += amount;
        } else if (row.RowType === 'SummaryRow' && row.Cells) {
          sectionTotal = parseFloat(row.Cells[1]?.Value) || 0;
        }
      }

      // Categorize
      if (title.includes('income') || title.includes('revenue')) {
        result.revenue += sectionTotal;
        result.income_accounts.push(...accounts);
      } else if (title.includes('cost of') || title.includes('direct cost')) {
        result.cogs += Math.abs(sectionTotal);
        result.cogs_accounts.push(...accounts);
      } else if (title.includes('expense') && !title.includes('cost of')) {
        result.operating_expenses += Math.abs(sectionTotal);
        result.expense_accounts.push(...accounts);
      }
    } else if (section.RowType === 'Row' && section.Cells) {
      const label = section.Cells[0]?.Value?.toLowerCase() || '';
      const value = parseFloat(section.Cells[1]?.Value) || 0;

      if (label.includes('gross profit')) {
        result.gross_profit = value;
      } else if (label.includes('net profit') || label.includes('net loss')) {
        result.net_profit = value;
      }
    }
  }

  // Calculate if not provided
  if (result.gross_profit === 0) {
    result.gross_profit = result.revenue - result.cogs;
  }
  if (result.net_profit === 0) {
    result.net_profit = result.gross_profit - result.operating_expenses;
  }

  // Calculate margins
  result.gross_margin_pct = result.revenue > 0
    ? ((result.gross_profit / result.revenue) * 100).toFixed(2)
    : null;
  result.net_margin_pct = result.revenue > 0
    ? ((result.net_profit / result.revenue) * 100).toFixed(2)
    : null;

  return result;
}

async function upsertToSupabase(data) {
  const url = `${env.SUPABASE_URL}/rest/v1/monthly_pnl_snapshots`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error: ${res.status} - ${text.substring(0, 200)}`);
  }
}

function getMonthsToSync(args) {
  const months = [];
  const now = new Date();

  // Parse args
  const monthsBack = args.includes('--months')
    ? parseInt(args[args.indexOf('--months') + 1]) || 2
    : 2;
  const specificYear = args.includes('--year')
    ? parseInt(args[args.indexOf('--year') + 1])
    : null;

  if (specificYear) {
    // Sync all months of specified year
    for (let m = 1; m <= 12; m++) {
      if (specificYear < now.getFullYear() || (specificYear === now.getFullYear() && m <= now.getMonth() + 1)) {
        months.push({ year: specificYear, month: m });
      }
    }
  } else {
    // Sync last N months
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
  }

  return months;
}

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getLastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

(async () => {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  SYNC MONTHLY P&L FROM XERO TO SUPABASE                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  const args = process.argv.slice(2);
  const monthsToSync = getMonthsToSync(args);

  console.log(`Syncing ${monthsToSync.length} month(s):`);
  monthsToSync.forEach(m => console.log(`  - ${m.year}-${String(m.month).padStart(2, '0')}`));
  console.log('');

  // Get tokens for both businesses
  const tokens = {};
  for (const [key, config] of Object.entries(XERO_CONFIGS)) {
    if (!config.clientId) {
      console.log(`Skipping ${key} - not configured`);
      continue;
    }
    console.log(`Getting ${key} token...`);
    tokens[key] = await getToken(config);
  }
  console.log('');

  // Sync each month for each business
  let successCount = 0;
  let errorCount = 0;

  for (const { year, month } of monthsToSync) {
    const fromDate = formatDate(year, month, 1);
    const toDate = formatDate(year, month, getLastDayOfMonth(year, month));

    console.log(`\n${year}-${String(month).padStart(2, '0')}: ${fromDate} to ${toDate}`);

    for (const [bizKey, config] of Object.entries(XERO_CONFIGS)) {
      if (!tokens[bizKey]) continue;

      try {
        process.stdout.write(`  ${bizKey.padEnd(12)} `);

        const report = await getXeroPnL(tokens[bizKey], config.tenantId, fromDate, toDate);
        const parsed = parsePnLReport(report);

        if (!parsed) {
          console.log('No data');
          continue;
        }

        await upsertToSupabase({
          business_key: bizKey,
          period_year: year,
          period_month: month,
          revenue: parsed.revenue,
          cogs: parsed.cogs,
          gross_profit: parsed.gross_profit,
          operating_expenses: parsed.operating_expenses,
          net_profit: parsed.net_profit,
          gross_margin_pct: parsed.gross_margin_pct,
          net_margin_pct: parsed.net_margin_pct,
          income_accounts: parsed.income_accounts,
          cogs_accounts: parsed.cogs_accounts,
          expense_accounts: parsed.expense_accounts,
          synced_at: new Date().toISOString()
        });

        console.log(`$${parsed.revenue.toLocaleString()} rev | $${parsed.net_profit.toLocaleString()} net`);
        successCount++;
      } catch (err) {
        console.log(`ERROR: ${err.message.substring(0, 50)}`);
        errorCount++;
      }
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`Done! ${successCount} synced, ${errorCount} errors`);
  console.log('');
})();
