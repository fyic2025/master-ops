/**
 * Sync LiveChat Conversations to Supabase
 *
 * Fetches chat archives from LiveChat and stores in livechat_conversations/messages tables
 *
 * Required environment variables:
 *   - LIVECHAT_ACCOUNT_ID (or PAT account ID)
 *   - LIVECHAT_PAT (Personal Access Token)
 *
 * Usage: node sync-conversations.js [--days=7]
 */

const https = require('https');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

// Supabase config (BOO database)
const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// LiveChat config
const LIVECHAT_ACCOUNT_ID = process.env.LIVECHAT_ACCOUNT_ID;
const LIVECHAT_PAT = process.env.LIVECHAT_PAT;

// Parse command line args
const args = process.argv.slice(2);
const daysArg = args.find(a => a.startsWith('--days='));
const DAYS_TO_SYNC = daysArg ? parseInt(daysArg.split('=')[1]) : 7;

// ============================================
// HTTP HELPERS
// ============================================

function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        } else {
          resolve({ statusCode: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// ============================================
// LIVECHAT API
// ============================================

async function livechatRequest(endpoint, body = null) {
  const auth = Buffer.from(`${LIVECHAT_ACCOUNT_ID}:${LIVECHAT_PAT}`).toString('base64');

  const postData = body ? JSON.stringify(body) : '{}';

  const options = {
    hostname: 'api.livechatinc.com',
    path: `/v3.5/agent/action/${endpoint}`,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const response = await httpsRequest(options, postData);
  return JSON.parse(response.data);
}

async function getArchives(pageId = null) {
  // When using page_id, can't include filters or limit
  const body = pageId ? { page_id: pageId } : { limit: 100 };
  return livechatRequest('list_archives', body);
}

async function getChatThreads(chatId) {
  return livechatRequest('list_threads', { chat_id: chatId });
}

async function getAllArchives(fromDate, toDate) {
  const allChats = [];
  let pageId = null;
  let page = 1;

  do {
    console.log(`  Fetching page ${page}...`);
    const result = await getArchives(pageId);

    if (result.chats && result.chats.length > 0) {
      // Filter by date client-side
      const filtered = result.chats.filter(chat => {
        const chatDate = new Date(chat.thread?.created_at || chat.created_at);
        return chatDate >= fromDate && chatDate <= toDate;
      });
      allChats.push(...filtered);
      console.log(`  Got ${filtered.length} chats in range (total: ${allChats.length})`);

      // If oldest chat in batch is before fromDate, we can stop
      const oldestInBatch = result.chats[result.chats.length - 1];
      const oldestDate = new Date(oldestInBatch?.thread?.created_at || oldestInBatch?.created_at);
      if (oldestDate < fromDate) {
        console.log(`  Reached chats older than ${fromDate.toISOString().split('T')[0]}, stopping`);
        break;
      }
    }

    pageId = result.next_page_id;
    page++;

    // Rate limiting - LiveChat allows 400 requests per minute
    await new Promise(r => setTimeout(r, 200));
  } while (pageId);

  return allChats;
}

// ============================================
// SUPABASE FUNCTIONS
// ============================================

async function supabaseRequest(method, path, body = null, headers = {}) {
  const url = new URL(SUPABASE_URL + path);

  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...headers,
    },
  };

  const postData = body ? JSON.stringify(body) : null;
  if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

  const response = await httpsRequest(options, postData);
  return JSON.parse(response.data || '[]');
}

async function upsertConversation(chat) {
  // Extract customer info
  const customer = chat.users?.find(u => u.type === 'customer') || {};
  const agent = chat.users?.find(u => u.type === 'agent') || {};

  // Calculate duration
  const startedAt = chat.thread?.created_at || chat.created_at;
  const endedAt = chat.thread?.closed_at || chat.closed_at;
  const durationSeconds = startedAt && endedAt
    ? Math.round((new Date(endedAt) - new Date(startedAt)) / 1000)
    : null;

  // Get messages from thread
  const messages = chat.thread?.events?.filter(e => e.type === 'message') || [];
  const customerMessages = messages.filter(m => m.author_id === customer.id);
  const agentMessages = messages.filter(m => m.author_id !== customer.id && m.type === 'message');

  // Calculate first response time
  let firstResponseTime = null;
  if (customerMessages.length > 0 && agentMessages.length > 0) {
    const firstCustomerMsg = new Date(customerMessages[0].created_at);
    const firstAgentMsg = new Date(agentMessages[0].created_at);
    if (firstAgentMsg > firstCustomerMsg) {
      firstResponseTime = Math.round((firstAgentMsg - firstCustomerMsg) / 1000);
    }
  }

  const record = {
    livechat_id: chat.id,
    thread_id: chat.thread?.id || null,
    customer_name: customer.name || null,
    customer_email: customer.email || null,
    customer_id: customer.id || null,
    agent_name: agent.name || null,
    agent_email: agent.email || null,
    agent_id: agent.id || null,
    started_at: startedAt,
    ended_at: endedAt,
    duration_seconds: durationSeconds,
    status: chat.thread?.active ? 'active' : 'closed',
    message_count: messages.length,
    customer_message_count: customerMessages.length,
    agent_message_count: agentMessages.length,
    first_response_time_seconds: firstResponseTime,
    tags: chat.thread?.tags || [],
    custom_variables: chat.thread?.properties || {},
    metadata: {
      source: chat.source || {},
      access: chat.access || {},
    },
    last_synced_at: new Date().toISOString(),
  };

  // Upsert conversation (on conflict update)
  const result = await supabaseRequest(
    'POST',
    '/rest/v1/livechat_conversations?on_conflict=livechat_id',
    record,
    { 'Prefer': 'resolution=merge-duplicates,return=representation' }
  );

  return result[0];
}

async function upsertMessages(conversationId, chat) {
  const events = chat.thread?.events || [];
  const messages = events.filter(e => e.type === 'message' || e.type === 'system_message' || e.type === 'file');

  if (messages.length === 0) return 0;

  const records = messages.map(msg => {
    // Determine author type
    let authorType = 'system';
    const author = chat.users?.find(u => u.id === msg.author_id);
    if (author) {
      authorType = author.type === 'customer' ? 'customer' : 'agent';
    }

    return {
      conversation_id: conversationId,
      livechat_message_id: msg.id,
      message_type: msg.type === 'file' ? 'file' : 'message',
      author_type: authorType,
      author_id: msg.author_id || null,
      author_name: author?.name || null,
      content: msg.text || msg.content || null,
      content_type: msg.content_type || 'text',
      attachments: msg.files || [],
      created_at_livechat: msg.created_at,
      metadata: {
        properties: msg.properties || {},
      },
    };
  });

  // Upsert in batches
  const batchSize = 50;
  let total = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      await supabaseRequest(
        'POST',
        '/rest/v1/livechat_messages',
        batch,
        { 'Prefer': 'resolution=merge-duplicates' }
      );
      total += batch.length;
    } catch (err) {
      console.error(`    Failed to insert messages batch: ${err.message}`);
    }
  }

  return total;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('========================================');
  console.log('LiveChat → Supabase Sync');
  console.log('========================================\n');

  // Validate credentials
  if (!LIVECHAT_ACCOUNT_ID || !LIVECHAT_PAT) {
    console.error('ERROR: Missing LiveChat credentials');
    console.error('Please set LIVECHAT_ACCOUNT_ID and LIVECHAT_PAT in .env');
    console.error('\nTo get credentials:');
    console.error('1. Go to LiveChat Developer Console: https://developers.livechat.com/console/');
    console.error('2. Create a Personal Access Token (PAT)');
    console.error('3. Add to .env:');
    console.error('   LIVECHAT_ACCOUNT_ID=your_account_id');
    console.error('   LIVECHAT_PAT=your_personal_access_token');
    process.exit(1);
  }

  if (!SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  // Calculate date range
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - DAYS_TO_SYNC);

  console.log(`Syncing conversations from ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`);
  console.log(`(${DAYS_TO_SYNC} days)\n`);

  // Step 1: Fetch archives from LiveChat
  console.log('1. Fetching chat archives from LiveChat...');
  let chats;
  try {
    chats = await getAllArchives(fromDate, toDate);
    console.log(`   Total chats: ${chats.length}\n`);
  } catch (err) {
    console.error('   Failed to fetch archives:', err.message);
    process.exit(1);
  }

  if (chats.length === 0) {
    console.log('No chats found in date range.');
    return;
  }

  // Step 2: Sync each conversation
  console.log('2. Syncing to Supabase...');
  let synced = 0;
  let messagesSynced = 0;
  let errors = 0;

  for (const chat of chats) {
    try {
      // Upsert conversation
      const conv = await upsertConversation(chat);

      // Upsert messages
      const msgCount = await upsertMessages(conv.id, chat);
      messagesSynced += msgCount;

      synced++;

      if (synced % 10 === 0) {
        console.log(`   Synced ${synced}/${chats.length} conversations...`);
      }
    } catch (err) {
      errors++;
      console.error(`   Failed to sync chat ${chat.id}: ${err.message}`);
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  // Summary
  console.log('\n========================================');
  console.log('Sync Complete!');
  console.log('========================================');
  console.log(`Conversations synced: ${synced}`);
  console.log(`Messages synced: ${messagesSynced}`);
  if (errors > 0) {
    console.log(`Errors: ${errors}`);
  }

  // Show stats
  if (chats.length > 0) {
    const withEmail = chats.filter(c => c.users?.some(u => u.type === 'customer' && u.email)).length;
    console.log(`\nConversations with customer email: ${withEmail}/${chats.length}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
