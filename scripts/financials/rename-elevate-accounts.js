/**
 * Rename Elevate Wholesale accounts to match Teelixir naming convention
 */
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

// Accounts to rename: { code: newName }
const RENAMES = {
  '815': 'Accrued Expenses',
  '445': 'Utilities - Light, Power, Heating',
  '462': 'Printing, Postage & Stationery',
  '485': 'Admin Subscriptions',
  '620': 'Prepayments _ Expenses',
};

async function getToken() {
  const creds = Buffer.from(env.XERO_ELEVATE_CLIENT_ID + ':' + env.XERO_ELEVATE_CLIENT_SECRET).toString('base64');
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + creds, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=refresh_token&refresh_token=' + env.XERO_ELEVATE_REFRESH_TOKEN
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(data));

  // Save new refresh token
  if (data.refresh_token && data.refresh_token !== env.XERO_ELEVATE_REFRESH_TOKEN) {
    let content = fs.readFileSync('.env', 'utf-8');
    content = content.replace(/XERO_ELEVATE_REFRESH_TOKEN=.*/, 'XERO_ELEVATE_REFRESH_TOKEN=' + data.refresh_token);
    fs.writeFileSync('.env', content);
    console.log('  Saved new refresh token to .env');
  }

  return data.access_token;
}

async function getAccounts(token) {
  const res = await fetch('https://api.xero.com/api.xro/2.0/Accounts', {
    headers: {
      'Authorization': 'Bearer ' + token,
      'xero-tenant-id': env.XERO_ELEVATE_TENANT_ID,
      'Accept': 'application/json'
    }
  });
  const data = await res.json();
  return data.Accounts || [];
}

async function renameAccount(token, accountId, currentCode, newName) {
  const res = await fetch('https://api.xero.com/api.xro/2.0/Accounts/' + accountId, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'xero-tenant-id': env.XERO_ELEVATE_TENANT_ID,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ Code: currentCode, Name: newName })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Failed to rename: ' + res.status + ' - ' + text.substring(0, 200));
  }

  return await res.json();
}

(async () => {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║  RENAME ELEVATE ACCOUNTS TO MATCH TEELIXIR                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.log('Getting access token...');
  const token = await getToken();

  console.log('Fetching accounts...\n');
  const accounts = await getAccounts(token);

  const codesToRename = Object.keys(RENAMES);
  let success = 0;
  let failed = 0;

  for (const code of codesToRename) {
    const account = accounts.find(a => a.Code === code && a.Status === 'ACTIVE');
    if (!account) {
      console.log('  ⚠️  Code ' + code + ' not found in Elevate');
      failed++;
      continue;
    }

    const newName = RENAMES[code];
    if (account.Name === newName) {
      console.log('  ✓ ' + code + ' already named correctly: ' + newName);
      success++;
      continue;
    }

    console.log('  Renaming ' + code + ':');
    console.log('    From: ' + account.Name);
    console.log('    To:   ' + newName);

    try {
      await renameAccount(token, account.AccountID, account.Code, newName);
      console.log('    ✅ Done\n');
      success++;
    } catch (err) {
      console.log('    ❌ Error: ' + err.message + '\n');
      failed++;
    }
  }

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('SUMMARY: ' + success + ' successful, ' + failed + ' failed');
  console.log('');
})();
