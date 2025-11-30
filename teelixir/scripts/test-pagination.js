#!/usr/bin/env node
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
    console.log('URL:', url.toString());
    const qs = url.search.substring(1);
    const sig = this.generateSignature(qs);
    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json', 'api-auth-id': this.apiId, 'api-auth-signature': sig }
    });
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  }
}

async function testPagination() {
  await creds.load('teelixir');
  const client = new Client();

  // Test with different parameter names
  console.log('\nTest 1: pageSize + page 1');
  const r1 = await client.request('/Customers', { pageSize: 5, page: 1 });
  console.log('Items:', r1.Items.length, '- First:', r1.Items[0].CustomerCode);
  console.log('Pagination:', r1.Pagination);

  console.log('\nTest 2: pageSize + page 2');
  const r2 = await client.request('/Customers', { pageSize: 5, page: 2 });
  console.log('Items:', r2.Items.length, '- First:', r2.Items[0].CustomerCode);
  console.log('Same as page 1?', r1.Items[0].CustomerCode === r2.Items[0].CustomerCode);

  console.log('\nTest 3: pageSize + pageNumber 2');
  const r3 = await client.request('/Customers', { pageSize: 5, pageNumber: 2 });
  console.log('Items:', r3.Items.length, '- First:', r3.Items[0].CustomerCode);
  console.log('Different from page 1?', r1.Items[0].CustomerCode !== r3.Items[0].CustomerCode);
}

testPagination().catch(console.error);
