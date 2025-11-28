/**
 * Analyze Checkout Issues from LiveChat
 *
 * Pulls all checkout_issues conversations and extracts patterns
 */

const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function request(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data || '[]')));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('========================================');
  console.log('Checkout Issues Analysis');
  console.log('========================================\n');

  // Get all checkout issues
  const conversations = await request(
    '/rest/v1/livechat_conversations?issue_category=eq.checkout_issues&select=id,customer_name,customer_email,started_at,ai_summary,ai_insights&order=started_at.desc&limit=100'
  );

  console.log(`Found ${conversations.length} checkout issue conversations\n`);

  // Analyze patterns in the summaries
  const patterns = {
    'promo/coupon': 0,
    'payment method': 0,
    'cart issues': 0,
    'can\'t checkout': 0,
    'price/total': 0,
    'shipping cost': 0,
    'afterpay/zip': 0,
    'error message': 0,
    'other': 0,
  };

  const issues = [];

  for (const conv of conversations) {
    const summary = (conv.ai_summary || '').toLowerCase();
    const keywords = conv.ai_insights?.matched_keywords || [];

    let categorized = false;

    if (summary.includes('promo') || summary.includes('coupon') || summary.includes('discount') || summary.includes('voucher') || summary.includes('code')) {
      patterns['promo/coupon']++;
      categorized = true;
    }
    if (summary.includes('afterpay') || summary.includes('zip') || summary.includes('klarna')) {
      patterns['afterpay/zip']++;
      categorized = true;
    }
    if (summary.includes('payment') || summary.includes('pay') || summary.includes('card') || summary.includes('paypal')) {
      patterns['payment method']++;
      categorized = true;
    }
    if (summary.includes('cart') || summary.includes('add') || summary.includes('basket')) {
      patterns['cart issues']++;
      categorized = true;
    }
    if (summary.includes('error') || summary.includes('not working') || summary.includes('won\'t')) {
      patterns['error message']++;
      categorized = true;
    }
    if (summary.includes('shipping') || summary.includes('delivery') || summary.includes('freight')) {
      patterns['shipping cost']++;
      categorized = true;
    }
    if (summary.includes('price') || summary.includes('total') || summary.includes('cost')) {
      patterns['price/total']++;
      categorized = true;
    }
    if (!categorized) {
      patterns['other']++;
    }

    issues.push({
      date: conv.started_at?.split('T')[0],
      customer: conv.customer_name || 'Anonymous',
      email: conv.customer_email,
      summary: conv.ai_summary?.substring(0, 100),
      keywords: keywords.slice(0, 5),
    });
  }

  console.log('Sub-category breakdown:');
  Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 0)
    .forEach(([cat, count]) => {
      const pct = ((count / conversations.length) * 100).toFixed(1);
      console.log(`  ${cat}: ${count} (${pct}%)`);
    });

  console.log('\n----------------------------------------');
  console.log('Recent checkout issues (last 20):');
  console.log('----------------------------------------\n');

  issues.slice(0, 20).forEach((issue, i) => {
    console.log(`${i + 1}. [${issue.date}] ${issue.customer}`);
    console.log(`   ${issue.summary || 'No summary'}`);
    if (issue.keywords?.length > 0) {
      console.log(`   Keywords: ${issue.keywords.join(', ')}`);
    }
    console.log('');
  });

  // Get actual message content for deeper analysis
  console.log('----------------------------------------');
  console.log('Sample conversations with full messages:');
  console.log('----------------------------------------\n');

  // Get 5 random checkout issue conversations with their messages
  const sampleConvs = conversations.slice(0, 5);

  for (const conv of sampleConvs) {
    const messages = await request(
      `/rest/v1/livechat_messages?conversation_id=eq.${conv.id}&select=author_type,content&order=created_at_livechat.asc`
    );

    console.log(`=== ${conv.customer_name || 'Anonymous'} (${conv.started_at?.split('T')[0]}) ===`);

    messages.forEach(msg => {
      if (msg.content) {
        const prefix = msg.author_type === 'customer' ? 'CUSTOMER' : 'AGENT';
        const content = msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content;
        console.log(`${prefix}: ${content}`);
      }
    });
    console.log('\n');
  }
}

main().catch(console.error);
