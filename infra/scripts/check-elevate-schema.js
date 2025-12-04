/**
 * Check actual schema of elevate_products in elevate project
 */

const https = require('https');

const ELEVATE = {
  url: 'https://xioudaqfmkdpkgujxehv.supabase.co',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpb3VkYXFmbWtkcGtndWp4ZWh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQyNDUxNCwiZXhwIjoyMDY5MDAwNTE0fQ.JKCXiyKUkXXOaQFtd2WQ0dKadbfcX67PkW-UetjZVB4'
};

async function getOneRow() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'xioudaqfmkdpkgujxehv.supabase.co',
      port: 443,
      path: '/rest/v1/elevate_products?select=*&limit=1',
      method: 'GET',
      headers: {
        'apikey': ELEVATE.serviceKey,
        'Authorization': `Bearer ${ELEVATE.serviceKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        console.log('Sample row from elevate_products:');
        console.log('');
        console.log('Columns found:');
        if (parsed && parsed[0]) {
          Object.keys(parsed[0]).forEach(col => {
            const val = parsed[0][col];
            const type = val === null ? 'null' : typeof val;
            console.log(`  ${col}: ${type} (sample: ${JSON.stringify(val).substring(0, 50)})`);
          });
        }
        resolve(parsed);
      });
    });

    req.on('error', reject);
    req.end();
  });
}

getOneRow();
