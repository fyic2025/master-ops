#!/usr/bin/env tsx

/**
 * BigCommerce API Credential Validator for Buy Organics Online
 *
 * Validates API access and checks available permissions
 * Store: Buy Organics Online (buyorganicsonline.com.au)
 * Store Hash: hhhi
 */

import 'dotenv/config';

interface BigCommerceConfig {
  storeHash: string;
  accessToken: string;
  clientId: string;
  baseUrl: string;
}

interface ValidationResult {
  endpoint: string;
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

class BigCommerceValidator {
  private config: BigCommerceConfig;

  constructor() {
    this.config = {
      storeHash: process.env.BIGCOMMERCE_BOO_STORE_HASH || 'hhhi',
      accessToken: process.env.BIGCOMMERCE_BOO_ACCESS_TOKEN || '',
      clientId: process.env.BIGCOMMERCE_BOO_CLIENT_ID || '',
      baseUrl: `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_BOO_STORE_HASH || 'hhhi'}/v3`,
    };
  }

  private async makeRequest(endpoint: string, method: string = 'GET'): Promise<ValidationResult> {
    const url = `${this.config.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'X-Auth-Token': this.config.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      return {
        endpoint,
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? JSON.stringify(data) : undefined,
        statusCode: response.status,
      };
    } catch (error) {
      return {
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async validateCredentials(): Promise<void> {
    console.log('\n🔍 BigCommerce API Credential Validation');
    console.log('=========================================\n');

    console.log('Configuration:');
    console.log(`  Store Hash: ${this.config.storeHash}`);
    console.log(`  Base URL: ${this.config.baseUrl}`);
    console.log(`  Client ID: ${this.config.clientId.substring(0, 10)}...`);
    console.log(`  Access Token: ${this.config.accessToken.substring(0, 10)}...\n`);

    if (!this.config.accessToken) {
      console.error('❌ Error: BIGCOMMERCE_BOO_ACCESS_TOKEN not set in environment');
      process.exit(1);
    }

    const tests: Array<{ name: string; endpoint: string; description: string }> = [
      { name: 'Store Info', endpoint: '/store', description: 'Basic store information' },
      { name: 'Products', endpoint: '/catalog/products?limit=1', description: 'Product catalog access' },
      { name: 'Orders', endpoint: '/orders?limit=1', description: 'Order history access' },
      { name: 'Customers', endpoint: '/customers?limit=1', description: 'Customer data access' },
      { name: 'Shipping Zones', endpoint: '/shipping/zones', description: 'Shipping configuration' },
      { name: 'Payment Methods', endpoint: '/payments/methods', description: 'Payment gateway configuration' },
      { name: 'Channels', endpoint: '/channels', description: 'Sales channel information' },
    ];

    const results: ValidationResult[] = [];

    for (const test of tests) {
      process.stdout.write(`Testing ${test.name}... `);
      const result = await this.makeRequest(test.endpoint);
      results.push(result);

      if (result.success) {
        console.log('✅ SUCCESS');
        if (test.endpoint === '/store' && result.data?.data) {
          console.log(`  Store: ${result.data.data.name}`);
          console.log(`  Domain: ${result.data.data.domain}`);
          console.log(`  Currency: ${result.data.data.currency}`);
        } else if (result.data?.data) {
          console.log(`  Found ${Array.isArray(result.data.data) ? result.data.data.length : 1} record(s)`);
        }
      } else {
        console.log(`❌ FAILED (${result.statusCode || 'N/A'})`);
        console.log(`  Error: ${result.error?.substring(0, 100)}`);
      }
    }

    // Summary
    console.log('\n📊 Validation Summary');
    console.log('====================\n');

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`Tests Passed: ${successCount}/${totalCount}`);
    console.log(`Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%\n`);

    if (successCount === totalCount) {
      console.log('✅ All validation tests passed!');
      console.log('   API credentials are valid and have required permissions.\n');

      // Display available permissions
      console.log('🔐 Confirmed API Permissions:');
      results.forEach(result => {
        if (result.success) {
          const permission = result.endpoint.split('/')[1];
          console.log(`   ✅ ${permission}`);
        }
      });
      console.log('');
    } else {
      console.log('⚠️  Some validation tests failed.');
      console.log('   Please check API credentials and permissions.\n');

      console.log('Missing Permissions:');
      results.forEach(result => {
        if (!result.success) {
          const permission = result.endpoint.split('/')[1];
          console.log(`   ❌ ${permission} (${result.statusCode || 'error'})`);
        }
      });
      console.log('');
      process.exit(1);
    }

    // Test rate limits
    console.log('⏱️  Testing Rate Limits...');
    const rateLimitTests = await this.testRateLimits();
    console.log(`   Requests completed: ${rateLimitTests.completed}`);
    console.log(`   Average response time: ${rateLimitTests.avgResponseTime}ms`);
    console.log(`   Rate limit status: ${rateLimitTests.rateLimitRemaining}/${rateLimitTests.rateLimitTotal} remaining\n`);

    console.log('✅ Validation complete! Ready to build checkout testing system.\n');
  }

  private async testRateLimits(): Promise<{
    completed: number;
    avgResponseTime: number;
    rateLimitRemaining: number;
    rateLimitTotal: number;
  }> {
    const startTime = Date.now();
    const testCount = 5;
    let rateLimitRemaining = 0;
    let rateLimitTotal = 0;

    for (let i = 0; i < testCount; i++) {
      const response = await fetch(`${this.config.baseUrl}/store`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': this.config.accessToken,
          'Content-Type': 'application/json',
        },
      });

      // BigCommerce returns rate limit info in headers
      const remaining = response.headers.get('X-Rate-Limit-Requests-Left');
      const total = response.headers.get('X-Rate-Limit-Requests-Quota');

      if (remaining) rateLimitRemaining = parseInt(remaining, 10);
      if (total) rateLimitTotal = parseInt(total, 10);
    }

    const endTime = Date.now();
    const avgResponseTime = Math.round((endTime - startTime) / testCount);

    return {
      completed: testCount,
      avgResponseTime,
      rateLimitRemaining,
      rateLimitTotal,
    };
  }
}

// Run validation
const validator = new BigCommerceValidator();
validator.validateCredentials().catch(error => {
  console.error('\n❌ Validation failed with error:', error);
  process.exit(1);
});
