/**
 * Test LiveChat API Connection
 *
 * Verifies credentials and shows account info
 *
 * Usage: node test-connection.js
 */

const https = require('https');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

const LIVECHAT_ACCOUNT_ID = process.env.LIVECHAT_ACCOUNT_ID;
const LIVECHAT_PAT = process.env.LIVECHAT_PAT;

function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function livechatRequest(api, endpoint, body = {}) {
  const auth = Buffer.from(`${LIVECHAT_ACCOUNT_ID}:${LIVECHAT_PAT}`).toString('base64');

  const postData = JSON.stringify(body);

  const response = await httpsRequest({
    hostname: 'api.livechatinc.com',
    path: `/v3.5/${api}/action/${endpoint}`,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  }, postData);

  return { status: response.statusCode, data: JSON.parse(response.data) };
}

async function main() {
  console.log('========================================');
  console.log('LiveChat Connection Test');
  console.log('========================================\n');

  if (!LIVECHAT_ACCOUNT_ID || !LIVECHAT_PAT) {
    console.error('ERROR: Missing credentials\n');
    console.error('Add to .env:');
    console.error('  LIVECHAT_ACCOUNT_ID=your_account_id');
    console.error('  LIVECHAT_PAT=your_personal_access_token');
    console.error('\nGet credentials at: https://developers.livechat.com/console/');
    process.exit(1);
  }

  console.log(`Account ID: ${LIVECHAT_ACCOUNT_ID}`);
  console.log(`PAT: ${LIVECHAT_PAT.substring(0, 10)}...`);
  console.log('');

  // Test 1: Get agent info via Configuration API
  console.log('1. Testing authentication...');
  try {
    const result = await livechatRequest('configuration', 'get_agent', {
      id: LIVECHAT_ACCOUNT_ID
    });

    if (result.status === 200) {
      console.log('   ✓ Authentication successful!');
      console.log(`   Agent: ${result.data.name || result.data.email || 'OK'}`);
      if (result.data.email) console.log(`   Email: ${result.data.email}`);
      if (result.data.role) console.log(`   Role: ${result.data.role}`);
    } else if (result.status === 401) {
      console.log(`   ✗ Authentication failed - check credentials`);
      process.exit(1);
    } else {
      // Try list_archives as fallback test
      console.log(`   Note: get_agent returned ${result.status}, trying archives...`);
    }
  } catch (err) {
    console.log(`   Note: ${err.message}, trying archives...`);
  }

  // Test 2: List recent chats via Agent API
  console.log('\n2. Fetching recent chats...');
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const result = await livechatRequest('agent', 'list_archives', { limit: 10 });

    if (result.status === 200) {
      const count = result.data.chats?.length || 0;
      console.log(`   ✓ Connected! Found ${count} recent chats`);

      if (count > 0) {
        console.log('\n   Recent chats:');
        result.data.chats.slice(0, 3).forEach(chat => {
          const customer = chat.users?.find(u => u.type === 'customer');
          const date = new Date(chat.thread?.created_at || chat.created_at).toLocaleDateString();
          console.log(`   - ${date}: ${customer?.name || customer?.email || 'Anonymous'}`);
        });
      }
    } else {
      console.log(`   ✗ Failed (${result.status}): ${result.data.error?.message || JSON.stringify(result.data)}`);
    }
  } catch (err) {
    console.error(`   ✗ Error: ${err.message}`);
  }

  console.log('\n========================================');
  console.log('Connection test complete!');
  console.log('========================================');
  console.log('\nRun sync with: node sync-conversations.js');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
