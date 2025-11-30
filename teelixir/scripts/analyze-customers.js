#!/usr/bin/env node
/**
 * Analyze Unleashed customer data for duplicates
 */

const crypto = require('crypto');
const creds = require('../../creds.js');

class TeelixirUnleashedClient {
  constructor() {
    this.apiId = process.env.TEELIXIR_UNLEASHED_API_ID || process.env.UNLEASHED_TEELIXIR_API_ID;
    this.apiKey = process.env.TEELIXIR_UNLEASHED_API_KEY || process.env.UNLEASHED_TEELIXIR_API_KEY;
    this.baseUrl = 'https://api.unleashedsoftware.com';
  }

  generateSignature(queryString) {
    const hmac = crypto.createHmac('sha256', this.apiKey);
    hmac.update(queryString);
    return hmac.digest('base64');
  }

  async request(path, params) {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    const queryString = url.search.substring(1);
    const signature = this.generateSignature(queryString);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'api-auth-id': this.apiId,
        'api-auth-signature': signature,
      },
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }
}

async function analyze() {
  await creds.load('teelixir');

  const client = new TeelixirUnleashedClient();

  // Get first page of customers
  console.log('Fetching first 200 customers...');
  const result = await client.request('/Customers', { pageSize: 200, page: 1 });

  const customers = result.Items;
  console.log('Received:', customers.length, 'customers');

  // Check for duplicates
  const codes = customers.map(c => c.CustomerCode);
  const uniqueCodes = [...new Set(codes)];
  console.log('Unique codes:', uniqueCodes.length);

  if (uniqueCodes.length !== codes.length) {
    console.log('\n⚠️ DUPLICATE CODES FOUND!');
  }

  // Sample codes
  console.log('\nSample customer codes:');
  customers.slice(0, 10).forEach(c => {
    const name = c.CustomerName || 'Unknown';
    console.log(' -', c.CustomerCode, ':', name.substring(0, 40));
  });

  // Pagination info
  console.log('\nPagination:', result.Pagination);
}

analyze().catch(console.error);
