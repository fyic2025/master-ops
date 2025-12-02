#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.SMARTLEAD_API_KEY;

console.log('\n🔍 Testing SmartLead API Endpoints...\n');

async function testEndpoint(url: string, method = 'GET') {
  try {
    const response = await fetch(url, { method });
    const data = await response.json();
    console.log(`${response.ok ? '✅' : '❌'} ${url}`);
    if (!response.ok) {
      console.log(`   Error: ${JSON.stringify(data).substring(0, 100)}...`);
    } else {
      console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}...`);
    }
    return { ok: response.ok, data };
  } catch (error: any) {
    console.log(`❌ ${url}`);
    console.log(`   Error: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

async function main() {
  const base = 'https://server.smartlead.ai/api/v1';
  
  // Test different endpoints
  await testEndpoint(`${base}/campaigns?api_key=${API_KEY}`);
  await testEndpoint(`${base}/email-accounts?api_key=${API_KEY}`);
  await testEndpoint(`${base}/leads?api_key=${API_KEY}&limit=1`);
}

main();
