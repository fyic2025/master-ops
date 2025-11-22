#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

function executeSQL(projectUrl, serviceKey, sql, projectName) {
  return new Promise((resolve, reject) => {
    console.log(`\n📦 Deploying to ${projectName}...`);

    // Parse URL
    const url = new URL(projectUrl);
    const projectRef = url.hostname.split('.')[0];

    // Supabase SQL execution endpoint (via query parameter approach)
    const options = {
      hostname: url.hostname,
      port: 443,
      path: `/rest/v1/rpc/exec_sql`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation'
      }
    };

    const payload = JSON.stringify({ query: sql });

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`   ✅ Schema deployed successfully!`);
          resolve({ success: true, project: projectName });
        } else {
          console.log(`   ❌ Deployment failed (${res.statusCode})`);
          console.log(`   Response:`, data.substring(0, 300));
          resolve({ success: false, project: projectName, error: data });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ Request error:`, error.message);
      resolve({ success: false, project: projectName, error: error.message });
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Direct SQL Deployment via HTTPS                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Read schema
  const schemaPath = path.join(__dirname, '..', 'database-schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  console.log(`\nRead ${schema.length} characters from schema file`);

  const results = [];

  // Deploy to Teelixir
  if (process.env.TEELIXIR_SUPABASE_URL && process.env.TEELIXIR_SUPABASE_SERVICE_ROLE_KEY) {
    results.push(await executeSQL(
      process.env.TEELIXIR_SUPABASE_URL,
      process.env.TEELIXIR_SUPABASE_SERVICE_ROLE_KEY,
      schema,
      'Teelixir'
    ));
  }

  // Deploy to Elevate
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    results.push(await executeSQL(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      schema,
      'Elevate'
    ));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DEPLOYMENT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.project}: ${r.success ? 'Success' : (r.error || 'Failed').substring(0, 100)}`);
  });

  const allSuccess = results.every(r => r.success);

  if (allSuccess) {
    console.log('\n✅ All databases configured successfully!');
  } else {
    console.log('\n⚠️  Some deployments failed. Supabase requires dashboard SQL execution.');
    console.log('\nManual execution instructions:');
    console.log('1. Teelixir: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new');
    console.log('2. Elevate:  https://supabase.com/dashboard/project/xioudaqfmkdpkgujxehv/sql/new');
    console.log('3. Copy/paste: /root/master-ops/agents/database-schema.sql');
  }

  process.exit(allSuccess ? 0 : 1);
}

main().catch(console.error);
