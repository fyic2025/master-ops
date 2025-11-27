const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function request(path, count = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    };
    if (count) headers['Prefer'] = 'count=exact';

    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ headers: res.headers, data: JSON.parse(data || '[]') }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('LiveChat Data in Supabase\n');

  // Get conversations
  const convs = await request('/rest/v1/livechat_conversations?select=id,livechat_id,customer_name,customer_email,started_at,message_count&order=started_at.desc&limit=10');
  console.log(`Recent conversations (showing 10):`);
  convs.data.forEach(c => {
    console.log(`  ${c.started_at?.split('T')[0]} | ${c.customer_name || 'Anonymous'} | ${c.customer_email || 'No email'} | ${c.message_count} msgs`);
  });

  // Get total count using count header
  const allConvs = await request('/rest/v1/livechat_conversations?select=id&limit=0', true);
  const convCount = allConvs.headers['content-range']?.split('/')[1] || 'unknown';
  console.log(`\nTotal conversations: ${convCount}`);

  const allMsgs = await request('/rest/v1/livechat_messages?select=id&limit=0', true);
  const msgCount = allMsgs.headers['content-range']?.split('/')[1] || 'unknown';
  console.log(`Total messages: ${msgCount}`);
}

main().catch(console.error);
