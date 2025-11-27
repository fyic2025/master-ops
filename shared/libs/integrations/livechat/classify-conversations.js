/**
 * Classify LiveChat Conversations using Keyword Matching
 *
 * Analyzes conversation messages and categorizes by issue type, sentiment, and urgency.
 *
 * Required environment variables:
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node classify-conversations.js [--limit=50] [--reprocess]
 */

const https = require('https');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Parse command line args
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const BATCH_LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : 500;
const REPROCESS = args.includes('--reprocess');

// Keyword patterns for classification (order matters - first match wins for ties)
const CATEGORY_PATTERNS = {
  checkout_issues: {
    keywords: [
      'checkout', 'can\'t checkout', 'cannot checkout', 'unable to checkout',
      'cart', 'add to cart', 'shopping cart', 'empty cart',
      'payment', 'pay', 'paying', 'card declined', 'transaction failed',
      'won\'t let me', 'not working', 'error', 'stuck',
      'can\'t purchase', 'cannot purchase', 'can\'t buy', 'cannot buy',
      'paypal', 'afterpay', 'zip pay', 'credit card',
      'promo code', 'coupon', 'discount code', 'voucher',
    ],
    weight: 10, // Higher priority
  },
  order_status: {
    keywords: [
      'order', 'my order', 'order status', 'order number',
      'tracking', 'track', 'where is', 'where\'s',
      'delivered', 'delivery', 'arrived', 'received',
      'dispatch', 'dispatched', 'shipped', 'shipping status',
      'eta', 'when will', 'how long',
    ],
    weight: 8,
  },
  returns_refunds: {
    keywords: [
      'return', 'refund', 'money back', 'exchange',
      'send back', 'wrong item', 'wrong product',
      'cancel', 'cancellation', 'cancelled',
      'damaged', 'broken', 'faulty', 'defective',
      'expired', 'expiry', 'best before',
    ],
    weight: 9,
  },
  shipping: {
    keywords: [
      'shipping', 'ship', 'postage', 'freight',
      'delivery time', 'delivery cost', 'shipping cost',
      'express', 'standard', 'free shipping',
      'australia post', 'auspost', 'courier',
      'delivery area', 'deliver to', 'po box',
      'international', 'overseas',
    ],
    weight: 6,
  },
  stock_availability: {
    keywords: [
      'stock', 'in stock', 'out of stock', 'available',
      'availability', 'back in stock', 'restock',
      'sold out', 'unavailable', 'discontinued',
      'when available', 'notify me',
    ],
    weight: 7,
  },
  product_inquiry: {
    keywords: [
      'product', 'ingredient', 'ingredients',
      'contain', 'contains', 'vegan', 'gluten',
      'organic', 'certified', 'natural',
      'how to use', 'dosage', 'directions',
      'recommend', 'recommendation', 'suggest',
      'difference between', 'compare', 'which one',
      'best for', 'good for', 'suitable',
      'allergy', 'allergic', 'intolerance',
    ],
    weight: 5,
  },
  account_help: {
    keywords: [
      'login', 'log in', 'sign in', 'password',
      'account', 'my account', 'register', 'registration',
      'forgot', 'reset', 'email', 'verify',
      'subscription', 'unsubscribe', 'newsletter',
    ],
    weight: 4,
  },
  complaint: {
    keywords: [
      'complaint', 'complain', 'unhappy', 'disappointed',
      'terrible', 'awful', 'worst', 'disgusted',
      'never again', 'rude', 'unprofessional',
      'poor service', 'bad service', 'horrible',
      'unacceptable', 'ridiculous', 'outrageous',
    ],
    weight: 9,
  },
  wholesale: {
    keywords: [
      'wholesale', 'bulk', 'trade', 'business',
      'resell', 'reseller', 'retail', 'store',
      'cafe', 'restaurant', 'clinic', 'practitioner',
      'abn', 'tax invoice', 'bulk order',
    ],
    weight: 8,
  },
};

// Sentiment keywords
const SENTIMENT_PATTERNS = {
  positive: [
    'thank', 'thanks', 'great', 'excellent', 'amazing',
    'wonderful', 'fantastic', 'love', 'happy', 'pleased',
    'helpful', 'appreciate', 'awesome', 'perfect', 'brilliant',
  ],
  negative: [
    'angry', 'frustrated', 'annoyed', 'disappointed', 'upset',
    'terrible', 'awful', 'horrible', 'worst', 'hate',
    'ridiculous', 'unacceptable', 'disgusted', 'furious',
    'still waiting', 'no response', 'ignored',
  ],
};

// Urgency keywords
const URGENCY_PATTERNS = {
  critical: [
    'urgent', 'asap', 'immediately', 'emergency',
    'right now', 'today', 'critical',
  ],
  high: [
    'please help', 'need help', 'stuck', 'can\'t',
    'won\'t work', 'not working', 'broken',
    'tomorrow', 'this week', 'soon as possible',
  ],
  medium: [
    'when', 'how long', 'waiting', 'follow up',
    'still', 'yet', 'any update',
  ],
};

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
      ...headers,
    },
  };

  const postData = body ? JSON.stringify(body) : null;
  if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

  const response = await httpsRequest(options, postData);
  return JSON.parse(response.data || '[]');
}

async function getUnclassifiedConversations(limit) {
  const filter = REPROCESS
    ? ''  // Get all conversations
    : '&issue_category=is.null';  // Only unclassified

  return supabaseRequest(
    'GET',
    `/rest/v1/livechat_conversations?select=id,livechat_id,customer_name,customer_email,started_at,message_count${filter}&message_count=gt.0&order=started_at.desc&limit=${limit}`
  );
}

async function getConversationMessages(conversationId) {
  return supabaseRequest(
    'GET',
    `/rest/v1/livechat_messages?conversation_id=eq.${conversationId}&select=author_type,author_name,content,created_at_livechat&order=created_at_livechat.asc`
  );
}

async function updateConversationClassification(conversationId, classification) {
  return supabaseRequest(
    'PATCH',
    `/rest/v1/livechat_conversations?id=eq.${conversationId}`,
    {
      issue_category: classification.category,
      sentiment: classification.sentiment,
      urgency: classification.urgency,
      ai_summary: classification.summary,
      ai_insights: classification,
      analyzed_at: new Date().toISOString(),
    },
    { 'Prefer': 'return=minimal' }
  );
}

// ============================================
// KEYWORD CLASSIFICATION
// ============================================

function classifyConversation(messages) {
  // Combine all customer messages into one text block
  const customerText = messages
    .filter(m => m.author_type === 'customer' && m.content)
    .map(m => m.content.toLowerCase())
    .join(' ');

  const allText = messages
    .filter(m => m.content)
    .map(m => m.content.toLowerCase())
    .join(' ');

  if (!customerText.trim()) {
    return {
      category: 'other',
      sentiment: 'neutral',
      urgency: 'low',
      summary: 'No customer messages',
      matched_keywords: [],
      confidence: 0,
    };
  }

  // Score each category
  const scores = {};
  const matchedKeywords = {};

  for (const [category, config] of Object.entries(CATEGORY_PATTERNS)) {
    let score = 0;
    const matched = [];

    for (const keyword of config.keywords) {
      if (customerText.includes(keyword.toLowerCase())) {
        score += config.weight;
        matched.push(keyword);
      }
    }

    scores[category] = score;
    matchedKeywords[category] = matched;
  }

  // Find best category
  let bestCategory = 'other';
  let bestScore = 0;
  let bestMatches = [];

  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
      bestMatches = matchedKeywords[category];
    }
  }

  // Determine sentiment
  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of SENTIMENT_PATTERNS.positive) {
    if (allText.includes(word)) positiveCount++;
  }
  for (const word of SENTIMENT_PATTERNS.negative) {
    if (allText.includes(word)) negativeCount++;
  }

  let sentiment = 'neutral';
  if (positiveCount > 0 && negativeCount > 0) sentiment = 'mixed';
  else if (positiveCount > negativeCount) sentiment = 'positive';
  else if (negativeCount > positiveCount) sentiment = 'negative';

  // Determine urgency
  let urgency = 'low';
  for (const word of URGENCY_PATTERNS.critical) {
    if (customerText.includes(word)) { urgency = 'critical'; break; }
  }
  if (urgency === 'low') {
    for (const word of URGENCY_PATTERNS.high) {
      if (customerText.includes(word)) { urgency = 'high'; break; }
    }
  }
  if (urgency === 'low') {
    for (const word of URGENCY_PATTERNS.medium) {
      if (customerText.includes(word)) { urgency = 'medium'; break; }
    }
  }

  // Generate summary from first customer message
  const firstCustomerMsg = messages.find(m => m.author_type === 'customer' && m.content);
  const summary = firstCustomerMsg
    ? firstCustomerMsg.content.substring(0, 150) + (firstCustomerMsg.content.length > 150 ? '...' : '')
    : 'No summary available';

  return {
    category: bestCategory,
    sentiment,
    urgency,
    summary,
    matched_keywords: bestMatches,
    confidence: Math.min(bestScore / 20, 1), // Normalize to 0-1
  };
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('========================================');
  console.log('LiveChat Conversation Classifier');
  console.log('(Keyword-based)');
  console.log('========================================\n');

  if (!SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  console.log(`Mode: ${REPROCESS ? 'Reprocess all' : 'Unclassified only'}`);
  console.log(`Batch limit: ${BATCH_LIMIT}\n`);

  // Step 1: Get conversations to classify
  console.log('1. Fetching conversations to classify...');
  let conversations;
  try {
    conversations = await getUnclassifiedConversations(BATCH_LIMIT);
    console.log(`   Found ${conversations.length} conversations\n`);
  } catch (err) {
    console.error('   Failed:', err.message);
    process.exit(1);
  }

  if (conversations.length === 0) {
    console.log('No conversations to classify.');
    return;
  }

  // Step 2: Classify each conversation
  console.log('2. Classifying conversations...');
  const stats = {
    classified: 0,
    errors: 0,
    byCategory: {},
    bySentiment: {},
    byUrgency: {},
  };

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    const progress = `[${i + 1}/${conversations.length}]`;

    try {
      // Get messages
      const messages = await getConversationMessages(conv.id);

      if (messages.length === 0) {
        console.log(`${progress} ${conv.customer_name || 'Anonymous'} - No messages, skipping`);
        continue;
      }

      // Classify with keywords
      const classification = classifyConversation(messages);

      // Update in Supabase
      await updateConversationClassification(conv.id, classification);

      // Update stats
      stats.classified++;
      stats.byCategory[classification.category] = (stats.byCategory[classification.category] || 0) + 1;
      stats.bySentiment[classification.sentiment] = (stats.bySentiment[classification.sentiment] || 0) + 1;
      stats.byUrgency[classification.urgency] = (stats.byUrgency[classification.urgency] || 0) + 1;

      if ((i + 1) % 50 === 0 || i === conversations.length - 1) {
        console.log(`${progress} Processed...`);
      }

      // Small delay to avoid overwhelming Supabase
      await new Promise(r => setTimeout(r, 50));
    } catch (err) {
      stats.errors++;
      console.error(`${progress} ${conv.customer_name || 'Anonymous'} - ERROR: ${err.message}`);
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('Classification Complete!');
  console.log('========================================');
  console.log(`Classified: ${stats.classified}`);
  console.log(`Errors: ${stats.errors}`);

  console.log('\nBy Category:');
  Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      const pct = ((count / stats.classified) * 100).toFixed(1);
      console.log(`  ${cat}: ${count} (${pct}%)`);
    });

  console.log('\nBy Sentiment:');
  Object.entries(stats.bySentiment)
    .sort((a, b) => b[1] - a[1])
    .forEach(([sent, count]) => {
      const pct = ((count / stats.classified) * 100).toFixed(1);
      console.log(`  ${sent}: ${count} (${pct}%)`);
    });

  console.log('\nBy Urgency:');
  Object.entries(stats.byUrgency)
    .sort((a, b) => b[1] - a[1])
    .forEach(([urg, count]) => {
      const pct = ((count / stats.classified) * 100).toFixed(1);
      console.log(`  ${urg}: ${count} (${pct}%)`);
    });
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
