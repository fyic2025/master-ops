/**
 * Apply Monthly P&L Schema to Supabase
 * Uses pg directly via Supabase connection string
 */
const fs = require('fs');

// Load env
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const sql = `
-- Monthly P&L Snapshots for Teelixir + Elevate
CREATE TABLE IF NOT EXISTS monthly_pnl_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_key TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  revenue DECIMAL(15, 2) DEFAULT 0,
  cogs DECIMAL(15, 2) DEFAULT 0,
  gross_profit DECIMAL(15, 2) DEFAULT 0,
  operating_expenses DECIMAL(15, 2) DEFAULT 0,
  net_profit DECIMAL(15, 2) DEFAULT 0,
  gross_margin_pct DECIMAL(5, 2),
  net_margin_pct DECIMAL(5, 2),
  income_accounts JSONB DEFAULT '[]',
  cogs_accounts JSONB DEFAULT '[]',
  expense_accounts JSONB DEFAULT '[]',
  xero_report_id TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_key, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_pnl_period ON monthly_pnl_snapshots(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_monthly_pnl_business ON monthly_pnl_snapshots(business_key);
`;

(async () => {
  console.log('Applying monthly_pnl_snapshots schema via Supabase...');

  // Use Supabase's SQL execution endpoint
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });

  // Alternatively, try to insert a test record to see if table exists
  const testUrl = `${env.SUPABASE_URL}/rest/v1/monthly_pnl_snapshots`;
  const testRes = await fetch(testUrl, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      business_key: 'test',
      period_year: 1900,
      period_month: 1,
      revenue: 0
    })
  });

  if (testRes.ok) {
    console.log('Table exists and is writable!');
    // Clean up test record
    await fetch(`${testUrl}?business_key=eq.test&period_year=eq.1900`, {
      method: 'DELETE',
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      }
    });
    console.log('Schema ready for sync.');
  } else {
    const error = await testRes.text();
    console.log('Table may not exist. Error:', error.substring(0, 200));
    console.log('');
    console.log('Please run this SQL in Supabase Dashboard > SQL Editor:');
    console.log('');
    console.log(sql);
  }
})();
