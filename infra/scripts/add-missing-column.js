/**
 * Add missing has_gst column to elevate_products in teelixir-leads
 */

const https = require('https');

const PROJECT_REF = 'qcvfxxsnqvdfmpbcgdni';
const ACCESS_TOKEN = 'sbp_b3c8e4797261a1dd37e4e85bdc00917cdb98d1f5';

const SQL = `ALTER TABLE elevate_products ADD COLUMN IF NOT EXISTS has_gst BOOLEAN;`;

async function executeSQL() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: SQL });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    console.log('Adding has_gst column...');

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Column added successfully!');
          resolve(true);
        } else {
          console.log('Response:', data);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

executeSQL();
