/**
 * Check various BigCommerce content sources for injected scripts
 */

const https = require('https');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const STORE_HASH = process.env.BC_BOO_STORE_HASH;
const ACCESS_TOKEN = process.env.BC_BOO_ACCESS_TOKEN;

function apiRequest(method, endpoint, version = 'v3') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.bigcommerce.com',
      path: `/stores/${STORE_HASH}/${version}${endpoint}`,
      method,
      headers: {
        'X-Auth-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          console.log(`  Error ${res.statusCode} for ${endpoint}`);
          resolve(null);
        } else {
          resolve(JSON.parse(data || '{}'));
        }
      });
    });

    req.on('error', (err) => {
      console.log(`  Error for ${endpoint}: ${err.message}`);
      resolve(null);
    });
    req.end();
  });
}

async function main() {
  console.log('Checking BigCommerce content sources for jQuery script...\n');

  // Check Scripts API (different endpoint)
  console.log('1. Checking v3/content/scripts...');
  const scripts = await apiRequest('GET', '/content/scripts');
  console.log(`   Found: ${scripts?.data?.length || 0} scripts`);

  // Check Widgets API
  console.log('\n2. Checking v3/content/widgets...');
  const widgets = await apiRequest('GET', '/content/widgets');
  console.log(`   Found: ${widgets?.data?.length || 0} widgets`);
  if (widgets?.data) {
    widgets.data.forEach(w => {
      console.log(`   - ${w.name} (${w.widget_template_uuid})`);
      if (w.widget_configuration) {
        const config = JSON.stringify(w.widget_configuration);
        if (config.includes('jquery') || config.includes('pagination') || config.includes('brand')) {
          console.log(`     ⚠️  Contains: ${config.substring(0, 200)}`);
        }
      }
    });
  }

  // Check Widget Templates
  console.log('\n3. Checking v3/content/widget-templates...');
  const widgetTemplates = await apiRequest('GET', '/content/widget-templates');
  console.log(`   Found: ${widgetTemplates?.data?.length || 0} widget templates`);
  if (widgetTemplates?.data) {
    widgetTemplates.data.forEach(wt => {
      const templateText = wt.template || '';
      if (templateText.includes('jquery') || templateText.includes('code.jquery.com')) {
        console.log(`   ⚠️  ${wt.name} contains jQuery!`);
        console.log(`      Preview: ${templateText.substring(0, 300)}`);
      }
    });
  }

  // Check Banners (v2 API)
  console.log('\n4. Checking v2/banners...');
  const banners = await apiRequest('GET', '/banners', 'v2');
  if (Array.isArray(banners)) {
    console.log(`   Found: ${banners.length} banners`);
    banners.forEach(b => {
      if (b.content && (b.content.includes('jquery') || b.content.includes('pagination') || b.content.includes('.ajax'))) {
        console.log(`   ⚠️  Banner "${b.name}" (ID: ${b.id}) contains suspicious code!`);
        console.log(`      Page: ${b.page}`);
        console.log(`      Location: ${b.location}`);
        console.log(`      Preview: ${b.content.substring(0, 500)}`);
      }
    });
  }

  // Check Pages
  console.log('\n5. Checking v2/pages (brands page)...');
  const pages = await apiRequest('GET', '/pages', 'v2');
  if (Array.isArray(pages)) {
    console.log(`   Found: ${pages.length} pages`);
    const brandsPage = pages.find(p => p.url && p.url.includes('brand'));
    if (brandsPage) {
      console.log(`   Found brands page: ${brandsPage.name} (${brandsPage.url})`);
    }
  }

  // Check Store Info
  console.log('\n6. Checking v2/store...');
  const store = await apiRequest('GET', '/store', 'v2');
  if (store) {
    console.log(`   Store: ${store.name}`);
    console.log(`   Domain: ${store.domain}`);
  }

  // Check Placements
  console.log('\n7. Checking v3/content/placements...');
  const placements = await apiRequest('GET', '/content/placements');
  console.log(`   Found: ${placements?.data?.length || 0} placements`);
  if (placements?.data) {
    placements.data.forEach(p => {
      console.log(`   - ${p.template_file} -> ${p.widget_uuid}`);
    });
  }

  console.log('\n' + '═'.repeat(60));
  console.log('NOTE: If no jQuery script found here, it might be in:');
  console.log('  - Theme footer.html or base.html templates');
  console.log('  - Google Tag Manager');
  console.log('  - A third-party app integration');
  console.log('═'.repeat(60));
}

main().catch(console.error);
