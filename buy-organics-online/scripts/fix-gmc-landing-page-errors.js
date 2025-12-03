/**
 * Fix GMC Landing Page Errors (404s)
 *
 * This script:
 * 1. Gets products with landing_page_error from Supabase
 * 2. Creates 301 redirects in BigCommerce for SEO
 * 3. Removes stale products from google_merchant_products table
 * 4. Updates gmc_issue_resolution to mark as fixed
 *
 * Usage: node scripts/fix-gmc-landing-page-errors.js [--dry-run]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');

// Supabase clients
const masterSupabase = createClient(
  'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// BigCommerce API
const BC_STORE_HASH = process.env.BC_BOO_STORE_HASH;
const BC_ACCESS_TOKEN = process.env.BC_BOO_ACCESS_TOKEN;

async function bcRequest(endpoint, method = 'GET', body = null) {
  const url = `https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v3${endpoint}`;
  const options = {
    method,
    headers: {
      'X-Auth-Token': BC_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`BC API Error: ${res.status} - ${error}`);
  }
  return res.json();
}

// Convert product title to URL slug
function titleToSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Determine best redirect target based on product type
function getRedirectTarget(title) {
  const lowerTitle = title.toLowerCase();

  // Map product types to category URLs
  if (lowerTitle.includes('yoga') || lowerTitle.includes('pilates') || lowerTitle.includes('gaiam')) {
    return '/fitness-yoga/';
  }
  if (lowerTitle.includes('tea') || lowerTitle.includes('herbal')) {
    return '/tea-coffee/herbal-tea/';
  }
  if (lowerTitle.includes('chocolate') || lowerTitle.includes('sweet william')) {
    return '/chocolate-sweets/';
  }
  if (lowerTitle.includes('collagen') || lowerTitle.includes('protein')) {
    return '/supplements/protein/';
  }
  if (lowerTitle.includes('oil') && (lowerTitle.includes('organic') || lowerTitle.includes('essential'))) {
    return '/beauty-personal-care/essential-oils/';
  }
  if (lowerTitle.includes('muesli') || lowerTitle.includes('cereal') || lowerTitle.includes('oat')) {
    return '/food/breakfast/';
  }
  if (lowerTitle.includes('gluten free') || lowerTitle.includes('orgran')) {
    return '/food/gluten-free/';
  }
  if (lowerTitle.includes('shampoo') || lowerTitle.includes('conditioner') || lowerTitle.includes('haircare')) {
    return '/beauty-personal-care/hair-care/';
  }
  if (lowerTitle.includes('honey')) {
    return '/food/honey-spreads/';
  }
  if (lowerTitle.includes('peanut butter') || lowerTitle.includes('spread')) {
    return '/food/spreads/';
  }

  // Default to homepage
  return '/';
}

async function main() {
  console.log('=== GMC Landing Page Error Fix ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}\n`);

  // Step 1: Get BOO account
  const { data: account, error: accountError } = await masterSupabase
    .from('google_ads_accounts')
    .select('id')
    .eq('business', 'boo')
    .single();

  if (accountError || !account) {
    console.error('Failed to get BOO account:', accountError);
    return;
  }
  console.log('BOO Account ID:', account.id);

  // Step 2: Get products with landing_page_error
  const { data: products, error: productsError } = await masterSupabase
    .from('google_merchant_products')
    .select('id, product_id, title, item_issues')
    .eq('account_id', account.id)
    .not('item_issues', 'is', null);

  if (productsError) {
    console.error('Failed to get products:', productsError);
    return;
  }

  const errorProducts = products.filter(p =>
    p.item_issues?.some(i => i.code === 'landing_page_error')
  );

  // Get unique by title
  const uniqueProducts = [...new Map(errorProducts.map(p => [p.title, p])).values()];
  console.log(`\nFound ${uniqueProducts.length} unique products with landing_page_error\n`);

  // Step 3: Create redirects in BigCommerce
  console.log('--- Creating 301 Redirects ---');
  let redirectsCreated = 0;
  let redirectsFailed = 0;

  for (const product of uniqueProducts) {
    const slug = titleToSlug(product.title);
    const oldPath = `/${slug}/`;
    const newPath = getRedirectTarget(product.title);

    console.log(`  ${product.title.substring(0, 40)}...`);
    console.log(`    From: ${oldPath}`);
    console.log(`    To:   ${newPath}`);

    if (!DRY_RUN) {
      try {
        await bcRequest('/storefront/redirects', 'POST', {
          from_path: oldPath,
          site_id: 1000, // Default storefront
          to: {
            type: 'url',
            url: newPath
          }
        });
        redirectsCreated++;
        console.log(`    ✓ Redirect created`);
      } catch (err) {
        // Redirect might already exist or path doesn't match
        console.log(`    ⚠ ${err.message.substring(0, 60)}`);
        redirectsFailed++;
      }
    } else {
      console.log(`    [DRY RUN] Would create redirect`);
    }
  }

  console.log(`\nRedirects: ${redirectsCreated} created, ${redirectsFailed} failed/skipped\n`);

  // Step 4: Remove stale products from Supabase
  console.log('--- Removing Stale Products from Supabase ---');
  const productIds = errorProducts.map(p => p.id);
  console.log(`Removing ${productIds.length} product records...`);

  if (!DRY_RUN) {
    const { error: deleteError } = await masterSupabase
      .from('google_merchant_products')
      .delete()
      .in('id', productIds);

    if (deleteError) {
      console.error('Failed to delete products:', deleteError);
    } else {
      console.log(`✓ Removed ${productIds.length} stale products from google_merchant_products`);
    }
  } else {
    console.log(`[DRY RUN] Would remove ${productIds.length} products`);
  }

  // Step 5: Update resolution status
  console.log('\n--- Updating Resolution Status ---');

  if (!DRY_RUN) {
    const { error: resError } = await masterSupabase
      .from('gmc_issue_resolution')
      .upsert({
        account_id: account.id,
        issue_code: 'landing_page_error',
        severity: 'warning',
        products_affected: uniqueProducts.length,
        status: 'fixed',
        fix_notes: `Removed ${uniqueProducts.length} discontinued products. Created ${redirectsCreated} redirects in BigCommerce.`,
        fixed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'account_id,issue_code'
      });

    if (resError) {
      console.error('Failed to update resolution:', resError);
    } else {
      console.log('✓ Marked landing_page_error as FIXED');
    }
  } else {
    console.log('[DRY RUN] Would mark landing_page_error as FIXED');
  }

  console.log('\n=== Complete ===');
  console.log(`Summary:`);
  console.log(`  - Products removed: ${productIds.length}`);
  console.log(`  - Redirects created: ${redirectsCreated}`);
  console.log(`  - Resolution: FIXED`);

  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

main().catch(console.error);
