/**
 * List BigCommerce Script Manager entries
 *
 * This script lists all scripts added via Script Manager to identify
 * problematic scripts affecting performance.
 */

const https = require('https');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const STORE_HASH = process.env.BC_BOO_STORE_HASH;
const ACCESS_TOKEN = process.env.BC_BOO_ACCESS_TOKEN;

function apiRequest(method, endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.bigcommerce.com',
      path: `/stores/${STORE_HASH}/v3${endpoint}`,
      method,
      headers: {
        'X-Auth-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`BigCommerce API ${res.statusCode}: ${data}`));
        } else {
          resolve(JSON.parse(data || '{}'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function listScripts() {
  console.log('Fetching Script Manager entries...\n');
  console.log(`Store Hash: ${STORE_HASH}`);
  console.log(`API Endpoint: /stores/${STORE_HASH}/v3/content/scripts\n`);

  try {
    const response = await apiRequest('GET', '/content/scripts');

    if (!response.data || response.data.length === 0) {
      console.log('No scripts found in Script Manager.');
      return;
    }

    console.log(`Found ${response.data.length} script(s):\n`);
    console.log('═'.repeat(80));

    response.data.forEach((script, index) => {
      console.log(`\n[${index + 1}] Script ID: ${script.uuid}`);
      console.log('─'.repeat(80));
      console.log(`  Name:        ${script.name}`);
      console.log(`  Enabled:     ${script.enabled}`);
      console.log(`  Location:    ${script.location}`);
      console.log(`  Visibility:  ${script.visibility}`);
      console.log(`  Kind:        ${script.kind}`);
      console.log(`  Channel ID:  ${script.channel_id || 'all'}`);
      console.log(`  Consent:     ${script.consent_category}`);
      console.log(`  Created:     ${script.date_created}`);
      console.log(`  Modified:    ${script.date_modified}`);

      if (script.src) {
        console.log(`  Source URL:  ${script.src}`);
      }

      if (script.html) {
        console.log(`  HTML Content:`);
        // Show first 500 chars of HTML
        const preview = script.html.substring(0, 500);
        console.log('  ' + preview.split('\n').join('\n  '));
        if (script.html.length > 500) {
          console.log(`  ... (${script.html.length - 500} more characters)`);
        }
      }

      // Flag potential issues
      const issues = [];
      if (script.html && script.html.includes('jquery')) {
        issues.push('Contains jQuery reference');
      }
      if (script.html && script.html.includes('jquery-ui')) {
        issues.push('Contains jQuery UI reference');
      }
      if (script.html && script.html.includes('.ajax(')) {
        issues.push('Makes AJAX calls');
      }
      if (script.html && script.html.includes('pagination')) {
        issues.push('References pagination');
      }
      if (script.html && script.html.includes('brand')) {
        issues.push('References brands');
      }

      if (issues.length > 0) {
        console.log(`\n  ⚠️  POTENTIAL ISSUES:`);
        issues.forEach(issue => console.log(`      - ${issue}`));
      }
    });

    console.log('\n' + '═'.repeat(80));

    return response.data;
  } catch (error) {
    console.error('Error fetching scripts:', error.message);
    throw error;
  }
}

listScripts().catch(console.error);
