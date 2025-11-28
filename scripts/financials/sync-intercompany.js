/**
 * Sync Intercompany Transactions to Supabase
 * Fetches invoices between Teelixir <-> Elevate and stores for dashboard
 */
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

// Intercompany contact patterns
const INTERCOMPANY_CONTACTS = [
  'kikai distribution', 'kikai distributions',
  'elevate wholesale',
  'teelixir pty', 'teelixir au pty'
];
const INTERCOMPANY_EXACT = ['teelixir'];
const EXCLUDE_CONTACTS = ['shopify', 'amazon', 'mydeal', 'ebay', 'kikai markets'];

function saveRefreshToken(envKey, newToken) {
  try {
    let content = fs.readFileSync('.env', 'utf-8');
    const regex = new RegExp(`^${envKey}=.*$`, 'm');
    content = regex.test(content) ? content.replace(regex, `${envKey}=${newToken}`) : content + `\n${envKey}=${newToken}`;
    fs.writeFileSync('.env', content);
  } catch (e) { /* ignore */ }
}

async function getToken(clientId, clientSecret, refreshToken, name, envKey) {
  const creds = Buffer.from(clientId + ':' + clientSecret).toString('base64');
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + creds, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=refresh_token&refresh_token=' + refreshToken
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(name + ' token refresh failed: ' + JSON.stringify(data));
  if (data.refresh_token && envKey) saveRefreshToken(envKey, data.refresh_token);
  return data.access_token;
}

async function getInvoices(token, tenantId, type, fromDate) {
  const url = `https://api.xero.com/api.xro/2.0/Invoices?where=Type=="${type}"&&Date>=DateTime(${fromDate.getFullYear()},${fromDate.getMonth()+1},${fromDate.getDate()})&order=Date DESC`;
  const res = await fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + token,
      'xero-tenant-id': tenantId,
      'Accept': 'application/json'
    }
  });
  return (await res.json()).Invoices || [];
}

function isIntercompanyContact(name) {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  if (EXCLUDE_CONTACTS.some(ex => lower.includes(ex))) return false;
  if (INTERCOMPANY_CONTACTS.some(ic => lower.includes(ic))) return true;
  if (INTERCOMPANY_EXACT.some(ex => lower === ex)) return true;
  return false;
}

function parseXeroDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('/Date(')) {
    const ms = parseInt(dateStr.match(/\d+/)[0]);
    return new Date(ms).toISOString().split('T')[0];
  }
  return new Date(dateStr).toISOString().split('T')[0];
}

async function supabaseUpsert(table, data) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}`;
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
  return res;
}

(async () => {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  SYNC INTERCOMPANY TRANSACTIONS TO SUPABASE                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 90);
  console.log('Syncing from: ' + fromDate.toISOString().split('T')[0] + '\n');

  // Get tokens
  console.log('Getting access tokens...');
  const teelixirToken = await getToken(
    env.XERO_TEELIXIR_CLIENT_ID, env.XERO_TEELIXIR_CLIENT_SECRET,
    env.XERO_TEELIXIR_REFRESH_TOKEN, 'Teelixir', 'XERO_TEELIXIR_REFRESH_TOKEN'
  );
  const elevateToken = await getToken(
    env.XERO_ELEVATE_CLIENT_ID, env.XERO_ELEVATE_CLIENT_SECRET,
    env.XERO_ELEVATE_REFRESH_TOKEN, 'Elevate', 'XERO_ELEVATE_REFRESH_TOKEN'
  );

  // Fetch all invoices
  console.log('Fetching Teelixir invoices...');
  const teelixirSales = await getInvoices(teelixirToken, env.XERO_TEELIXIR_TENANT_ID, 'ACCREC', fromDate);
  const teelixirPurchases = await getInvoices(teelixirToken, env.XERO_TEELIXIR_TENANT_ID, 'ACCPAY', fromDate);

  console.log('Fetching Elevate invoices...');
  const elevateSales = await getInvoices(elevateToken, env.XERO_ELEVATE_TENANT_ID, 'ACCREC', fromDate);
  const elevatePurchases = await getInvoices(elevateToken, env.XERO_ELEVATE_TENANT_ID, 'ACCPAY', fromDate);

  // Process intercompany transactions
  const transactions = [];

  // Teelixir → Elevate (Sales)
  teelixirSales.filter(inv => isIntercompanyContact(inv.Contact?.Name)).forEach(inv => {
    transactions.push({
      source_entity: 'teelixir',
      target_entity: 'elevate',
      direction: 'sale',
      transaction_type: 'intercompany_sale',
      invoice_number: inv.InvoiceNumber,
      invoice_id: inv.InvoiceID,
      invoice_date: parseXeroDate(inv.Date),
      contact_name: inv.Contact?.Name,
      subtotal: inv.SubTotal || 0,
      tax: inv.TotalTax || 0,
      total: inv.Total || 0,
      status: inv.Status,
      elimination_type: 'revenue_cogs',
      period_year: new Date(parseXeroDate(inv.Date)).getFullYear(),
      period_month: new Date(parseXeroDate(inv.Date)).getMonth() + 1,
      synced_at: new Date().toISOString()
    });
  });

  // Elevate ← Teelixir (Purchases - matching side)
  elevatePurchases.filter(inv => isIntercompanyContact(inv.Contact?.Name)).forEach(inv => {
    transactions.push({
      source_entity: 'elevate',
      target_entity: 'teelixir',
      direction: 'purchase',
      transaction_type: 'intercompany_purchase',
      invoice_number: inv.InvoiceNumber,
      invoice_id: inv.InvoiceID,
      invoice_date: parseXeroDate(inv.Date),
      contact_name: inv.Contact?.Name,
      subtotal: inv.SubTotal || 0,
      tax: inv.TotalTax || 0,
      total: inv.Total || 0,
      status: inv.Status,
      elimination_type: 'revenue_cogs',
      period_year: new Date(parseXeroDate(inv.Date)).getFullYear(),
      period_month: new Date(parseXeroDate(inv.Date)).getMonth() + 1,
      synced_at: new Date().toISOString()
    });
  });

  // Elevate → Teelixir (Sales - reverse direction)
  elevateSales.filter(inv => isIntercompanyContact(inv.Contact?.Name)).forEach(inv => {
    transactions.push({
      source_entity: 'elevate',
      target_entity: 'teelixir',
      direction: 'sale',
      transaction_type: 'intercompany_service', // Likely warehousing/freight
      invoice_number: inv.InvoiceNumber,
      invoice_id: inv.InvoiceID,
      invoice_date: parseXeroDate(inv.Date),
      contact_name: inv.Contact?.Name,
      subtotal: inv.SubTotal || 0,
      tax: inv.TotalTax || 0,
      total: inv.Total || 0,
      status: inv.Status,
      elimination_type: 'service_expense',
      period_year: new Date(parseXeroDate(inv.Date)).getFullYear(),
      period_month: new Date(parseXeroDate(inv.Date)).getMonth() + 1,
      synced_at: new Date().toISOString()
    });
  });

  // Teelixir ← Elevate (Purchases - matching side)
  teelixirPurchases.filter(inv => isIntercompanyContact(inv.Contact?.Name)).forEach(inv => {
    transactions.push({
      source_entity: 'teelixir',
      target_entity: 'elevate',
      direction: 'purchase',
      transaction_type: 'intercompany_service',
      invoice_number: inv.InvoiceNumber,
      invoice_id: inv.InvoiceID,
      invoice_date: parseXeroDate(inv.Date),
      contact_name: inv.Contact?.Name,
      subtotal: inv.SubTotal || 0,
      tax: inv.TotalTax || 0,
      total: inv.Total || 0,
      status: inv.Status,
      elimination_type: 'service_expense',
      period_year: new Date(parseXeroDate(inv.Date)).getFullYear(),
      period_month: new Date(parseXeroDate(inv.Date)).getMonth() + 1,
      synced_at: new Date().toISOString()
    });
  });

  // Summary
  const summary = {
    teelixir_to_elevate_sales: transactions.filter(t => t.source_entity === 'teelixir' && t.direction === 'sale').length,
    elevate_from_teelixir_purchases: transactions.filter(t => t.source_entity === 'elevate' && t.direction === 'purchase').length,
    elevate_to_teelixir_sales: transactions.filter(t => t.source_entity === 'elevate' && t.direction === 'sale').length,
    teelixir_from_elevate_purchases: transactions.filter(t => t.source_entity === 'teelixir' && t.direction === 'purchase').length
  };

  console.log('\nTransactions found:');
  console.log('  Teelixir → Elevate sales:      ' + summary.teelixir_to_elevate_sales);
  console.log('  Elevate ← Teelixir purchases:  ' + summary.elevate_from_teelixir_purchases);
  console.log('  Elevate → Teelixir sales:      ' + summary.elevate_to_teelixir_sales);
  console.log('  Teelixir ← Elevate purchases:  ' + summary.teelixir_from_elevate_purchases);
  console.log('  Total:                         ' + transactions.length);

  // Save to Supabase
  if (transactions.length > 0) {
    console.log('\nSaving to Supabase...');

    // Batch upsert in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < transactions.length; i += chunkSize) {
      const chunk = transactions.slice(i, i + chunkSize);
      await supabaseUpsert('intercompany_transactions', chunk);
      console.log(`  Saved ${Math.min(i + chunkSize, transactions.length)}/${transactions.length}`);
    }

    console.log('\n✅ Sync complete!');
  } else {
    console.log('\nNo transactions to sync.');
  }

  // Calculate totals for elimination summary
  const totals = {
    teelixir_to_elevate: transactions
      .filter(t => t.source_entity === 'teelixir' && t.direction === 'sale')
      .reduce((sum, t) => sum + t.total, 0),
    elevate_to_teelixir: transactions
      .filter(t => t.source_entity === 'elevate' && t.direction === 'sale')
      .reduce((sum, t) => sum + t.total, 0)
  };

  console.log('\nElimination Summary:');
  console.log('  Revenue to eliminate (Teelixir → Elevate): $' + totals.teelixir_to_elevate.toLocaleString());
  console.log('  Revenue to eliminate (Elevate → Teelixir): $' + totals.elevate_to_teelixir.toLocaleString());
  console.log('  Total eliminations: $' + (totals.teelixir_to_elevate + totals.elevate_to_teelixir).toLocaleString());
  console.log('');
})();
