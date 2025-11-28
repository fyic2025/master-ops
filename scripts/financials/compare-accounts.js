const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

function saveRefreshToken(envKey, newToken) {
  try {
    let content = fs.readFileSync('.env', 'utf-8');
    const regex = new RegExp(`^${envKey}=.*$`, 'm');
    content = regex.test(content) ? content.replace(regex, `${envKey}=${newToken}`) : content + `\n${envKey}=${newToken}`;
    fs.writeFileSync('.env', content);
  } catch (e) { /* ignore */ }
}

async function getAccounts(name, clientId, clientSecret, refreshToken, tenantId, envKey) {
  const creds = Buffer.from(clientId + ':' + clientSecret).toString('base64');
  const tokenRes = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + creds, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=refresh_token&refresh_token=' + refreshToken
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) { console.log(name + ': Token failed'); return []; }
  // Auto-save new refresh token
  if (tokenData.refresh_token && envKey) saveRefreshToken(envKey, tokenData.refresh_token);

  const accRes = await fetch('https://api.xero.com/api.xro/2.0/Accounts', {
    headers: { 'Authorization': 'Bearer ' + tokenData.access_token, 'xero-tenant-id': tenantId, 'Accept': 'application/json' }
  });
  const accData = await accRes.json();
  return accData.Accounts || [];
}

// Normalize name for comparison
function normalize(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Check if names are similar (one contains the other or high overlap)
function similar(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return false; // exact match, not "similar"
  if (na.includes(nb) || nb.includes(na)) return true;
  // Check word overlap
  const wordsA = (a || '').toLowerCase().split(/\s+/);
  const wordsB = (b || '').toLowerCase().split(/\s+/);
  const overlap = wordsA.filter(w => w.length > 3 && wordsB.includes(w));
  return overlap.length >= 2;
}

(async () => {
  const teelixir = await getAccounts('Teelixir', env.XERO_TEELIXIR_CLIENT_ID, env.XERO_TEELIXIR_CLIENT_SECRET, env.XERO_TEELIXIR_REFRESH_TOKEN, env.XERO_TEELIXIR_TENANT_ID, 'XERO_TEELIXIR_REFRESH_TOKEN');
  const elevate = await getAccounts('Elevate', env.XERO_ELEVATE_CLIENT_ID, env.XERO_ELEVATE_CLIENT_SECRET, env.XERO_ELEVATE_REFRESH_TOKEN, env.XERO_ELEVATE_TENANT_ID, 'XERO_ELEVATE_REFRESH_TOKEN');

  const tActive = teelixir.filter(a => a.Status === 'ACTIVE' && a.Code);
  const eActive = elevate.filter(a => a.Status === 'ACTIVE' && a.Code);

  // Build name lookup for Teelixir
  const teelixirByNorm = {};
  tActive.forEach(a => { teelixirByNorm[normalize(a.Name)] = a; });

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  ELEVATE ACCOUNTS - NAMING COMPARISON TO TEELIXIR (MASTER)                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  // 1. Exact name match (good - no changes needed)
  console.log('=== EXACT NAME MATCH (No changes needed) ===');
  const exactMatches = [];
  eActive.forEach(e => {
    const match = teelixirByNorm[normalize(e.Name)];
    if (match) exactMatches.push({ elevate: e, teelixir: match });
  });
  exactMatches.sort((a,b) => a.elevate.Name.localeCompare(b.elevate.Name)).forEach(m => {
    console.log('  ✓ ' + m.elevate.Name);
  });
  console.log('  Total: ' + exactMatches.length + ' accounts\n');

  // 2. Similar names (might need standardizing)
  console.log('=== SIMILAR NAMES (Consider standardizing Elevate → Teelixir) ===');
  const usedTeelixir = new Set(exactMatches.map(m => m.teelixir.Code));
  const similarMatches = [];
  eActive.forEach(e => {
    if (teelixirByNorm[normalize(e.Name)]) return; // skip exact matches
    tActive.forEach(t => {
      if (usedTeelixir.has(t.Code)) return;
      if (similar(e.Name, t.Name)) {
        similarMatches.push({ elevate: e, teelixir: t });
      }
    });
  });
  similarMatches.sort((a,b) => a.elevate.Name.localeCompare(b.elevate.Name)).forEach(m => {
    console.log('  Elevate:  ' + m.elevate.Code.padEnd(8) + m.elevate.Name);
    console.log('  Teelixir: ' + m.teelixir.Code.padEnd(8) + m.teelixir.Name);
    console.log('');
  });
  console.log('  Total: ' + similarMatches.length + ' accounts\n');

  // 3. Elevate accounts with no match in Teelixir
  const matchedElevate = new Set([...exactMatches.map(m => m.elevate.Code), ...similarMatches.map(m => m.elevate.Code)]);
  console.log('=== ELEVATE-ONLY (No equivalent in Teelixir) ===');
  eActive.filter(e => !matchedElevate.has(e.Code)).sort((a,b) => a.Name.localeCompare(b.Name)).forEach(e => {
    console.log('  ' + e.Code.padEnd(8) + e.Name.padEnd(45) + e.Type);
  });
  console.log('');
})();
