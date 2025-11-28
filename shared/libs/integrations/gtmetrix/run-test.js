#!/usr/bin/env node
/**
 * GTMetrix Performance Test Runner
 *
 * Run performance tests on websites and get actionable recommendations.
 *
 * Usage:
 *   node run-test.js <url>                    # Test a URL
 *   node run-test.js --boo                    # Test Buy Organics Online
 *   node run-test.js --teelixir              # Test Teelixir
 *   node run-test.js --rhf                   # Test Red Hill Fresh
 *   node run-test.js --status                # Check API credits
 *   node run-test.js --recent                # List recent tests
 *
 * Options:
 *   --json          Output raw JSON instead of formatted report
 *   --save          Save results to Supabase
 *
 * Examples:
 *   node run-test.js https://www.buyorganicsonline.com.au
 *   node run-test.js https://www.buyorganicsonline.com.au/organic-foods --save
 *   node run-test.js --boo --json
 */

const gtmetrix = require('./client');

// Predefined URLs for our businesses
const BUSINESS_URLS = {
  boo: 'https://www.buyorganicsonline.com.au',
  teelixir: 'https://teelixir.com',
  rhf: 'https://www.redhillfresh.com.au',
};

// Parse arguments
const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const urls = args.filter(a => !a.startsWith('--'));

const outputJson = flags.includes('--json');
const saveToDb = flags.includes('--save');

async function main() {
  try {
    // Check status
    if (flags.includes('--status')) {
      const status = await gtmetrix.getAccountStatus();
      console.log('GTMetrix Account Status');
      console.log('───────────────────────────────────────');
      console.log(`  Credits Used:      ${status.creditsUsed}`);
      console.log(`  Credits Remaining: ${status.creditsRemaining}`);
      console.log(`  Refills At:        ${status.refillsAt}`);
      return;
    }

    // List recent tests
    if (flags.includes('--recent')) {
      const tests = await gtmetrix.listTests(10);
      console.log('Recent GTMetrix Tests');
      console.log('───────────────────────────────────────');
      tests.forEach(t => {
        console.log(`  ${t.id} | ${t.state.padEnd(10)} | ${t.createdAt} | ${t.url}`);
      });
      return;
    }

    // Determine URL to test
    let url = urls[0];

    if (flags.includes('--boo')) url = BUSINESS_URLS.boo;
    if (flags.includes('--teelixir')) url = BUSINESS_URLS.teelixir;
    if (flags.includes('--rhf')) url = BUSINESS_URLS.rhf;

    if (!url) {
      console.log('Usage: node run-test.js <url>');
      console.log('');
      console.log('Options:');
      console.log('  --boo       Test Buy Organics Online');
      console.log('  --teelixir  Test Teelixir');
      console.log('  --rhf       Test Red Hill Fresh');
      console.log('  --status    Check API credits');
      console.log('  --recent    List recent tests');
      console.log('  --json      Output raw JSON');
      console.log('  --save      Save results to Supabase');
      process.exit(1);
    }

    // Run the test
    console.log(`Starting GTMetrix test for: ${url}`);
    console.log('This may take 1-3 minutes...\n');

    const test = await gtmetrix.runTest(url);
    console.log(`Test ID: ${test.id}`);
    console.log('Waiting for results...\n');

    const results = await gtmetrix.waitForResults(test.id);
    const issues = gtmetrix.analyzeResults(results);

    if (outputJson) {
      console.log(JSON.stringify({ results, issues }, null, 2));
    } else {
      console.log(gtmetrix.formatReport(results, issues));
    }

    // Save to Supabase if requested
    if (saveToDb) {
      await saveResults(url, results, issues);
      console.log('✅ Results saved to Supabase');
    }

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

async function saveResults(url, results, issues) {
  const https = require('https');
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

  const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Determine business from URL
  let business = 'other';
  if (url.includes('buyorganicsonline')) business = 'boo';
  else if (url.includes('teelixir')) business = 'teelixir';
  else if (url.includes('redhillfresh')) business = 'rhf';

  const record = {
    business,
    url,
    test_id: results.id,
    gtmetrix_grade: results.scores.gtmetrix,
    performance_score: results.scores.performance,
    structure_score: results.scores.structure,
    lcp_ms: results.webVitals.lcp,
    tbt_ms: results.webVitals.tbt,
    cls: results.webVitals.cls,
    fully_loaded_ms: results.metrics.fullyLoaded,
    page_size_bytes: results.metrics.totalPageSize,
    total_requests: results.metrics.totalRequests,
    issues: issues,
    report_url: results.reports.reportUrl,
    tested_at: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(record);

    const req = https.request({
      hostname: 'qcvfxxsnqvdfmpbcgdni.supabase.co',
      path: '/rest/v1/gtmetrix_tests',
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Supabase error: ${data}`));
        } else {
          resolve();
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

main();
