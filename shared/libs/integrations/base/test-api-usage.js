/**
 * Test API Usage Logging
 * Inserts sample data to verify the tracking system works
 */

const { logApiUsage, SERVICES } = require('./api-usage');

async function testUsageLogging() {
  console.log('Testing API Usage Logging...\n');

  // Test logging for various services
  const tests = [
    { service: SERVICES.GOOGLE_MERCHANT, calls: 25, errors: 0 },
    { service: SERVICES.GMC_PERFORMANCE, calls: 8, errors: 0 },
    { service: SERVICES.GSC, calls: 150, errors: 2 },
    { service: SERVICES.XERO, calls: 45, errors: 1 },
    { service: SERVICES.BIGCOMMERCE, calls: 80, errors: 0 },
  ];

  for (const test of tests) {
    console.log(`Logging ${test.calls} calls for ${test.service}...`);
    const success = await logApiUsage(test.service, test.calls, test.errors);
    if (success) {
      console.log(`  ✓ Success`);
    } else {
      console.log(`  ✗ Failed`);
    }
  }

  console.log('\n========================================');
  console.log('Test data inserted successfully!');
  console.log('View at: http://localhost:3002/home');
  console.log('========================================\n');
}

testUsageLogging().catch(console.error);
