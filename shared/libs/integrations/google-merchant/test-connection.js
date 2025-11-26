/**
 * Test Google Merchant Center Connection
 *
 * Usage: node test-connection.js
 */

const https = require('https');

const SUPABASE_HOST = 'usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

// Load a single credential from vault
async function getCredential(project, name) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ p_name: name, p_project: project });

    const req = https.request({
      hostname: SUPABASE_HOST,
      path: '/rest/v1/rpc/get_credential',
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Failed to get credential: ${data}`));
        } else {
          // Remove quotes from string response
          const value = data.replace(/^"|"$/g, '');
          resolve(value);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Load credentials from .env file
async function loadCredentials() {
  require('dotenv').config({ path: require('path').join(__dirname, '../../../../.env') });

  return {
    clientId: process.env.GOOGLE_ADS_CLIENT_ID,
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_ADS_BOO_REFRESH_TOKEN,
    merchantId: process.env.GMC_BOO_MERCHANT_ID,
  };
}

// Refresh access token
async function getAccessToken(clientId, clientSecret, refreshToken) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString();

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Token refresh failed: ${data}`));
        } else {
          const json = JSON.parse(data);
          resolve(json.access_token);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Make API request
async function merchantRequest(accessToken, merchantId, path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'shoppingcontent.googleapis.com',
      path: `/content/v2.1/${merchantId}${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`API error (${res.statusCode}): ${data}`));
        } else {
          resolve(JSON.parse(data));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Loading credentials from vault...');
  const creds = await loadCredentials();

  console.log('Credentials loaded:');
  console.log('  Client ID:', creds.clientId ? '✓' : '✗');
  console.log('  Client Secret:', creds.clientSecret ? '✓' : '✗');
  console.log('  Refresh Token:', creds.refreshToken ? '✓' : '✗');
  console.log('  Merchant ID:', creds.merchantId || '✗');

  if (!creds.merchantId) {
    console.error('\nMerchant ID not found in vault!');
    process.exit(1);
  }

  console.log('\nGetting access token...');
  const accessToken = await getAccessToken(
    creds.clientId,
    creds.clientSecret,
    creds.refreshToken
  );
  console.log('Access token obtained ✓');

  console.log('\nFetching account status...');
  try {
    const status = await merchantRequest(
      accessToken,
      creds.merchantId,
      `/accountstatuses/${creds.merchantId}`
    );

    console.log('\n✓ Merchant Center Connection Successful!\n');
    console.log('Account ID:', status.accountId);

    if (status.products) {
      console.log('\nProduct Counts:');
      console.log('  Active:', status.products.active || 0);
      console.log('  Pending:', status.products.pending || 0);
      console.log('  Disapproved:', status.products.disapproved || 0);
      console.log('  Expiring:', status.products.expiring || 0);
    }

    if (status.accountLevelIssues?.length > 0) {
      console.log('\nAccount Issues:');
      status.accountLevelIssues.forEach(issue => {
        console.log(`  [${issue.severity}] ${issue.title}`);
      });
    } else {
      console.log('\nNo account-level issues ✓');
    }

  } catch (err) {
    console.error('\n✗ Failed to connect to Merchant Center');
    console.error('Error:', err.message);

    if (err.message.includes('401')) {
      console.log('\nThe refresh token may be invalid or expired.');
      console.log('You may need to re-authorize the OAuth flow.');
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
