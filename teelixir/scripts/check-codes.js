#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const creds = require('../../creds.js');
const crypto = require('crypto');

class Client {
  constructor() {
    this.apiId = process.env.TEELIXIR_UNLEASHED_API_ID || process.env.UNLEASHED_TEELIXIR_API_ID;
    this.apiKey = process.env.TEELIXIR_UNLEASHED_API_KEY || process.env.UNLEASHED_TEELIXIR_API_KEY;
    this.baseUrl = 'https://api.unleashedsoftware.com';
  }

  generateSignature(qs) {
    return crypto.createHmac('sha256', this.apiKey).update(qs).digest('base64');
  }

  async request(path, params) {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          url.searchParams.append(k, String(v));
        }
      });
    }
    const qs = url.search.substring(1);
    const sig = this.generateSignature(qs);
    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json', 'api-auth-id': this.apiId, 'api-auth-signature': sig }
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  }
}

async function checkCodes() {
  await creds.load('teelixir');
  await creds.load('global');

  const client = new Client();

  // Get pages 1 and 2
  console.log('Fetching customers from Unleashed...');
  const page1 = await client.request('/Customers', { pageSize: 200, page: 1 });
  const page2 = await client.request('/Customers', { pageSize: 200, page: 2 });

  const codes1 = new Set(page1.Items.map(c => c.CustomerCode));
  const codes2 = new Set(page2.Items.map(c => c.CustomerCode));

  console.log('Page 1 unique codes:', codes1.size);
  console.log('Page 2 unique codes:', codes2.size);

  // Check overlap
  let overlap = 0;
  codes2.forEach(code => {
    if (codes1.has(code)) overlap++;
  });
  console.log('Overlap between pages:', overlap);

  // Sample from page 2
  console.log('\nSample codes from page 2:');
  page2.Items.slice(0, 5).forEach(c => console.log(' -', c.CustomerCode, ':', c.CustomerName));

  // Check what is in the DB
  const supabase = createClient(
    process.env.MASTER_SUPABASE_URL,
    process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('\nSample codes in DB:');
  const { data } = await supabase.from('tlx_distributors').select('customer_code, customer_name').limit(5);
  data.forEach(d => console.log(' -', d.customer_code, ':', d.customer_name));

  // Check if page 2 codes exist in DB
  const sampleCode = page2.Items[0].CustomerCode;
  const { data: existing } = await supabase
    .from('tlx_distributors')
    .select('id, customer_code')
    .eq('customer_code', sampleCode);
  console.log('\nPage 2 first code', sampleCode, 'exists in DB:', existing && existing.length > 0);

  // Check if it's the SAME 200 codes being updated
  const allDbCodes = await supabase.from('tlx_distributors').select('customer_code');
  const dbCodeSet = new Set(allDbCodes.data.map(d => d.customer_code));

  let page1InDb = 0, page2InDb = 0;
  codes1.forEach(code => { if (dbCodeSet.has(code)) page1InDb++; });
  codes2.forEach(code => { if (dbCodeSet.has(code)) page2InDb++; });

  console.log('\nPage 1 codes found in DB:', page1InDb, '/ 200');
  console.log('Page 2 codes found in DB:', page2InDb, '/ 200');
}

checkCodes().catch(console.error);
