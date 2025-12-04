/**
 * Create elevate_products table in teelixir-leads via Supabase Management API
 */

const https = require('https');

const PROJECT_REF = 'qcvfxxsnqvdfmpbcgdni';
const ACCESS_TOKEN = 'sbp_b3c8e4797261a1dd37e4e85bdc00917cdb98d1f5';

const SQL = `
CREATE TABLE IF NOT EXISTS elevate_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elevate_product_id BIGINT NOT NULL,
  elevate_variant_id BIGINT NOT NULL UNIQUE,
  sku TEXT,
  title TEXT,
  variant_title TEXT,
  vendor TEXT,
  wholesale_price DECIMAL(10,2),
  rrp DECIMAL(10,2),
  rrp_source TEXT,
  shopify_metafield_id BIGINT,
  last_synced_at TIMESTAMPTZ,
  last_rrp_pushed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elevate_products_sku ON elevate_products(sku);
CREATE INDEX IF NOT EXISTS idx_elevate_products_vendor ON elevate_products(vendor);
CREATE INDEX IF NOT EXISTS idx_elevate_products_rrp_null ON elevate_products(rrp) WHERE rrp IS NULL;

CREATE OR REPLACE FUNCTION update_elevate_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_elevate_products_updated_at ON elevate_products;
CREATE TRIGGER trigger_elevate_products_updated_at
  BEFORE UPDATE ON elevate_products
  FOR EACH ROW
  EXECUTE FUNCTION update_elevate_products_updated_at();
`;

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

    console.log('Executing SQL on teelixir-leads project...');
    console.log('');

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ SQL executed successfully!');
          try {
            const parsed = JSON.parse(data);
            console.log('Response:', JSON.stringify(parsed, null, 2));
          } catch (e) {
            console.log('Response:', data);
          }
          resolve(true);
        } else {
          console.log('❌ SQL execution failed');
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

executeSQL()
  .then(() => {
    console.log('');
    console.log('Table created. Now run:');
    console.log('  node infra/scripts/migrate-elevate-products.js');
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
