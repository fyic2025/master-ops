/**
 * Analyze Intercompany Transactions - Teelixir <-> Elevate
 * Looks at past 90 days to identify all intercompany activity
 */
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

// Intercompany contact patterns (case-insensitive partial match)
// Note: Kikai Distribution = Elevate Wholesale (same entity)
// Kikai Markets is SEPARATE (outside consolidation)
const INTERCOMPANY_CONTACTS = [
  'kikai distribution', 'kikai distributions',
  'elevate wholesale',
  'teelixir pty', 'teelixir au pty'
];
// Exact match contacts (for cases like "Teelixir" without "pty")
const INTERCOMPANY_EXACT = ['teelixir'];
// Exclude these even if they match
const EXCLUDE_CONTACTS = ['shopify', 'amazon', 'mydeal', 'ebay', 'kikai markets'];

function saveRefreshToken(envKey, newToken) {
  try {
    let content = fs.readFileSync('.env', 'utf-8');
    const regex = new RegExp(`^${envKey}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${envKey}=${newToken}`);
    } else {
      content += `\n${envKey}=${newToken}`;
    }
    fs.writeFileSync('.env', content);
  } catch (e) { /* ignore save errors */ }
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
  // Auto-save new refresh token
  if (data.refresh_token && envKey) {
    saveRefreshToken(envKey, data.refresh_token);
  }
  return data.access_token;
}

async function getInvoices(token, tenantId, type, fromDate) {
  // type = 'ACCREC' (sales) or 'ACCPAY' (purchases)
  const url = `https://api.xero.com/api.xro/2.0/Invoices?where=Type=="${type}"&&Date>=DateTime(${fromDate.getFullYear()},${fromDate.getMonth()+1},${fromDate.getDate()})&order=Date DESC`;
  const res = await fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + token,
      'xero-tenant-id': tenantId,
      'Accept': 'application/json'
    }
  });
  const data = await res.json();
  return data.Invoices || [];
}

async function getJournals(token, tenantId, fromDate) {
  const url = `https://api.xero.com/api.xro/2.0/Journals?offset=0&paymentsOnly=false`;
  const res = await fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + token,
      'xero-tenant-id': tenantId,
      'Accept': 'application/json'
    }
  });
  const data = await res.json();
  // Filter by date
  return (data.Journals || []).filter(j => new Date(j.JournalDate) >= fromDate);
}

function isIntercompanyContact(name) {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  // Exclude marketplace/storefront contacts
  if (EXCLUDE_CONTACTS.some(ex => lower.includes(ex))) return false;
  // Check partial matches
  if (INTERCOMPANY_CONTACTS.some(ic => lower.includes(ic))) return true;
  // Check exact matches (for simple names like "Teelixir")
  if (INTERCOMPANY_EXACT.some(ex => lower === ex)) return true;
  return false;
}

function formatCurrency(amt) {
  return '$' + (amt || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'.padEnd(12);
  // Handle Xero date format: /Date(1234567890000)/
  if (dateStr.includes('/Date(')) {
    const ms = parseInt(dateStr.match(/\d+/)[0]);
    return new Date(ms).toISOString().split('T')[0].padEnd(12);
  }
  try {
    return new Date(dateStr).toISOString().split('T')[0].padEnd(12);
  } catch (e) {
    return String(dateStr).substring(0, 10).padEnd(12);
  }
}

(async () => {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  INTERCOMPANY TRANSACTION ANALYSIS - TEELIXIR <-> ELEVATE (90 days)          ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 90);
  console.log('Analyzing from: ' + fromDate.toISOString().split('T')[0] + '\n');

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

  // Fetch data
  console.log('Fetching Teelixir sales invoices...');
  const teelixirSales = await getInvoices(teelixirToken, env.XERO_TEELIXIR_TENANT_ID, 'ACCREC', fromDate);

  console.log('Fetching Teelixir purchase invoices...');
  const teelixirPurchases = await getInvoices(teelixirToken, env.XERO_TEELIXIR_TENANT_ID, 'ACCPAY', fromDate);

  console.log('Fetching Elevate sales invoices...');
  const elevateSales = await getInvoices(elevateToken, env.XERO_ELEVATE_TENANT_ID, 'ACCREC', fromDate);

  console.log('Fetching Elevate purchase invoices...');
  const elevatePurchases = await getInvoices(elevateToken, env.XERO_ELEVATE_TENANT_ID, 'ACCPAY', fromDate);

  console.log('\n');

  // 1. Teelixir sales TO Elevate/Kikai (should eliminate as group revenue)
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('1. TEELIXIR SALES TO ELEVATE/KIKAI (Eliminate: duplicates group revenue)');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  const teelixirToElevate = teelixirSales.filter(inv => isIntercompanyContact(inv.Contact?.Name));
  let teelixirToElevateTotal = 0;

  if (teelixirToElevate.length === 0) {
    console.log('  No invoices found to Elevate/Kikai contacts\n');
  } else {
    teelixirToElevate.forEach(inv => {
      teelixirToElevateTotal += inv.Total || 0;
      console.log('  ' + (inv.InvoiceNumber || 'N/A').padEnd(15) +
        formatDate(inv.Date) +
        (inv.Contact?.Name || 'N/A').substring(0, 25).padEnd(27) +
        formatCurrency(inv.Total).padStart(12));
    });
    console.log('  ' + '─'.repeat(66));
    console.log('  TOTAL TO ELIMINATE:'.padEnd(54) + formatCurrency(teelixirToElevateTotal).padStart(12));
    console.log('');
  }

  // 2. Elevate purchases FROM Teelixir (matching side - should also eliminate)
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('2. ELEVATE PURCHASES FROM TEELIXIR (Eliminate: matches #1 above)');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  const elevateFromTeelixir = elevatePurchases.filter(inv => isIntercompanyContact(inv.Contact?.Name));
  let elevateFromTeelixirTotal = 0;

  if (elevateFromTeelixir.length === 0) {
    console.log('  No purchase invoices found from Teelixir contacts\n');
  } else {
    elevateFromTeelixir.forEach(inv => {
      elevateFromTeelixirTotal += inv.Total || 0;
      console.log('  ' + (inv.InvoiceNumber || 'N/A').padEnd(15) +
        formatDate(inv.Date) +
        (inv.Contact?.Name || 'N/A').substring(0, 25).padEnd(27) +
        formatCurrency(inv.Total).padStart(12));
    });
    console.log('  ' + '─'.repeat(66));
    console.log('  TOTAL:'.padEnd(54) + formatCurrency(elevateFromTeelixirTotal).padStart(12));
    console.log('');
  }

  // 3. Elevate sales TO Teelixir (reverse direction - if any)
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('3. ELEVATE SALES TO TEELIXIR (Reverse intercompany - if any)');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  const elevateToTeelixir = elevateSales.filter(inv => isIntercompanyContact(inv.Contact?.Name));
  let elevateToTeelixirTotal = 0;

  if (elevateToTeelixir.length === 0) {
    console.log('  No invoices found to Teelixir contacts\n');
  } else {
    elevateToTeelixir.forEach(inv => {
      elevateToTeelixirTotal += inv.Total || 0;
      console.log('  ' + (inv.InvoiceNumber || 'N/A').padEnd(15) +
        formatDate(inv.Date) +
        (inv.Contact?.Name || 'N/A').substring(0, 25).padEnd(27) +
        formatCurrency(inv.Total).padStart(12));
    });
    console.log('  ' + '─'.repeat(66));
    console.log('  TOTAL:'.padEnd(54) + formatCurrency(elevateToTeelixirTotal).padStart(12));
    console.log('');
  }

  // 4. Teelixir purchases FROM Elevate (if any)
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('4. TEELIXIR PURCHASES FROM ELEVATE (Reverse intercompany - if any)');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  const teelixirFromElevate = teelixirPurchases.filter(inv => isIntercompanyContact(inv.Contact?.Name));
  let teelixirFromElevateTotal = 0;

  if (teelixirFromElevate.length === 0) {
    console.log('  No purchase invoices found from Elevate/Kikai contacts\n');
  } else {
    teelixirFromElevate.forEach(inv => {
      teelixirFromElevateTotal += inv.Total || 0;
      console.log('  ' + (inv.InvoiceNumber || 'N/A').padEnd(15) +
        formatDate(inv.Date) +
        (inv.Contact?.Name || 'N/A').substring(0, 25).padEnd(27) +
        formatCurrency(inv.Total).padStart(12));
    });
    console.log('  ' + '─'.repeat(66));
    console.log('  TOTAL:'.padEnd(54) + formatCurrency(teelixirFromElevateTotal).padStart(12));
    console.log('');
  }

  // 5. Look for loan/balance accounts
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('5. INTERCOMPANY LOAN ACCOUNTS');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  // Get account balances
  async function getTrialBalance(token, tenantId) {
    const today = new Date().toISOString().split('T')[0];
    const url = `https://api.xero.com/api.xro/2.0/Reports/TrialBalance?date=${today}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'xero-tenant-id': tenantId,
        'Accept': 'application/json'
      }
    });
    return await res.json();
  }

  const teelixirTB = await getTrialBalance(teelixirToken, env.XERO_TEELIXIR_TENANT_ID);
  const elevateTB = await getTrialBalance(elevateToken, env.XERO_ELEVATE_TENANT_ID);

  console.log('  TEELIXIR loan/intercompany accounts:');
  if (teelixirTB.Reports && teelixirTB.Reports[0] && teelixirTB.Reports[0].Rows) {
    teelixirTB.Reports[0].Rows.forEach(section => {
      if (section.Rows) {
        section.Rows.forEach(row => {
          if (row.Cells && row.Cells[0]) {
            const name = row.Cells[0].Value || '';
            if (name.toLowerCase().includes('kikai') || name.toLowerCase().includes('elevate') ||
                name.toLowerCase().includes('loan') && (name.toLowerCase().includes('payable') || name.toLowerCase().includes('receivable'))) {
              const debit = parseFloat(row.Cells[1]?.Value) || 0;
              const credit = parseFloat(row.Cells[2]?.Value) || 0;
              const balance = debit - credit;
              if (Math.abs(balance) > 0.01) {
                console.log('    ' + name.substring(0, 45).padEnd(47) + formatCurrency(balance).padStart(12));
              }
            }
          }
        });
      }
    });
  }

  console.log('\n  ELEVATE loan/intercompany accounts:');
  if (elevateTB.Reports && elevateTB.Reports[0] && elevateTB.Reports[0].Rows) {
    elevateTB.Reports[0].Rows.forEach(section => {
      if (section.Rows) {
        section.Rows.forEach(row => {
          if (row.Cells && row.Cells[0]) {
            const name = row.Cells[0].Value || '';
            if (name.toLowerCase().includes('kikai') || name.toLowerCase().includes('teelixir') ||
                name.toLowerCase().includes('loan') && (name.toLowerCase().includes('payable') || name.toLowerCase().includes('receivable'))) {
              const debit = parseFloat(row.Cells[1]?.Value) || 0;
              const credit = parseFloat(row.Cells[2]?.Value) || 0;
              const balance = debit - credit;
              if (Math.abs(balance) > 0.01) {
                console.log('    ' + name.substring(0, 45).padEnd(47) + formatCurrency(balance).padStart(12));
              }
            }
          }
        });
      }
    });
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('SUMMARY & RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  console.log('INTERCOMPANY ACTIVITY (90 days):');
  console.log('  Teelixir → Elevate sales:     ' + formatCurrency(teelixirToElevateTotal).padStart(12) + '  (' + teelixirToElevate.length + ' invoices)');
  console.log('  Elevate ← Teelixir purchases: ' + formatCurrency(elevateFromTeelixirTotal).padStart(12) + '  (' + elevateFromTeelixir.length + ' invoices)');
  console.log('  Elevate → Teelixir sales:     ' + formatCurrency(elevateToTeelixirTotal).padStart(12) + '  (' + elevateToTeelixir.length + ' invoices)');
  console.log('  Teelixir ← Elevate purchases: ' + formatCurrency(teelixirFromElevateTotal).padStart(12) + '  (' + teelixirFromElevate.length + ' invoices)');

  const mismatch = Math.abs(teelixirToElevateTotal - elevateFromTeelixirTotal);
  if (mismatch > 1) {
    console.log('\n  ⚠️  MISMATCH: Teelixir sales vs Elevate purchases differ by ' + formatCurrency(mismatch));
    console.log('     This could be timing differences or missing invoices.');
  }

  console.log('\nELIMINATION ENTRIES NEEDED:');
  console.log('  1. Eliminate Teelixir revenue to Elevate:  DR Revenue ' + formatCurrency(teelixirToElevateTotal));
  console.log('                                            CR COGS     ' + formatCurrency(teelixirToElevateTotal));
  console.log('  2. Intercompany AR/AP should net to zero in consolidation');
  console.log('  3. Loan balances should offset (Teelixir receivable = Elevate payable)');

  console.log('\n');
})();
