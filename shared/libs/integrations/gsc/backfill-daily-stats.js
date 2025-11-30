/**
 * Backfill Historical GSC Daily Stats
 *
 * Fetches historical GSC data for month-on-month comparison
 * Usage: node backfill-daily-stats.js [--days=90]
 */

const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env'), override: true });

// BOO Supabase (where GSC data lives)
const SUPABASE_URL = process.env.BOO_SUPABASE_URL;
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY;

const SITE_URL = 'https://www.buyorganicsonline.com.au';

// OAuth2 credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const GOOGLE_GSC_REFRESH_TOKEN = process.env.GOOGLE_GSC_REFRESH_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Helper to get date string
 */
function getDateString(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

/**
 * Initialize GSC client
 */
async function initGSCClient() {
  if (!GOOGLE_GSC_REFRESH_TOKEN) {
    console.error('Missing GOOGLE_GSC_REFRESH_TOKEN in .env');
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'http://localhost'
  );

  oauth2Client.setCredentials({
    refresh_token: GOOGLE_GSC_REFRESH_TOKEN
  });

  try {
    const { token } = await oauth2Client.getAccessToken();
    if (!token) {
      console.error('Failed to get access token');
      return null;
    }
    console.log('GSC OAuth2 authenticated successfully');
  } catch (error) {
    console.error('OAuth2 authentication failed:', error.message);
    return null;
  }

  return google.searchconsole({ version: 'v1', auth: oauth2Client });
}

/**
 * Fetch GSC data for a specific date
 */
async function fetchDataForDate(gsc, date) {
  try {
    const response = await gsc.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: date,
        endDate: date,
        dimensions: ['page'],
        // Filter to Australia only
        dimensionFilterGroups: [{
          filters: [{
            dimension: 'country',
            operator: 'equals',
            expression: 'aus'
          }]
        }],
        rowLimit: 25000
      }
    });
    return response.data.rows || [];
  } catch (error) {
    console.error(`Error fetching data for ${date}:`, error.message);
    return [];
  }
}

/**
 * Check which dates already have data
 */
async function getExistingDates(business) {
  const { data, error } = await supabase
    .from('gsc_page_daily_stats')
    .select('stat_date')
    .eq('business', business)
    .order('stat_date', { ascending: false });

  if (error) {
    console.error('Error checking existing dates:', error.message);
    return new Set();
  }

  return new Set((data || []).map(r => r.stat_date));
}

/**
 * Main backfill function
 */
async function backfillDailyStats(options = {}) {
  const business = options.business || 'boo';
  const days = options.days || 90;

  console.log('='.repeat(60));
  console.log(`GSC DAILY STATS BACKFILL - ${business}`);
  console.log(`Backfilling ${days} days of data`);
  console.log('='.repeat(60));

  const gsc = await initGSCClient();
  if (!gsc) {
    console.log('Failed to initialize GSC client');
    return;
  }

  // Check existing dates
  const existingDates = await getExistingDates(business);
  console.log(`Found ${existingDates.size} existing dates`);

  // GSC data has ~2 day delay, start from 3 days ago
  const stats = { datesProcessed: 0, rowsInserted: 0, errors: 0 };

  for (let i = 3; i <= days + 2; i++) {
    const date = getDateString(-i);

    // Skip if we already have data for this date
    if (existingDates.has(date)) {
      console.log(`  ${date}: already exists, skipping`);
      continue;
    }

    console.log(`  ${date}: fetching...`);

    const pages = await fetchDataForDate(gsc, date);

    if (pages.length === 0) {
      console.log(`  ${date}: no data`);
      continue;
    }

    // Prepare batch data
    const dailyData = pages.map(row => ({
      business,
      url: row.keys[0],
      stat_date: date,
      impressions: Math.round(row.impressions),
      clicks: Math.round(row.clicks),
      avg_position: row.position?.toFixed(2),
      ctr: row.ctr?.toFixed(4),
      first_seen: date
    }));

    // Upsert in batches
    const BATCH_SIZE = 500;
    for (let j = 0; j < dailyData.length; j += BATCH_SIZE) {
      const batch = dailyData.slice(j, j + BATCH_SIZE);
      const { error } = await supabase
        .from('gsc_page_daily_stats')
        .upsert(batch, { onConflict: 'business,url,stat_date' });

      if (error) {
        stats.errors++;
        console.error(`    Batch error: ${error.message}`);
      } else {
        stats.rowsInserted += batch.length;
      }
    }

    stats.datesProcessed++;
    console.log(`  ${date}: ${pages.length} pages synced`);

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n' + '='.repeat(60));
  console.log('BACKFILL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Dates processed: ${stats.datesProcessed}`);
  console.log(`Rows inserted: ${stats.rowsInserted}`);
  console.log(`Errors: ${stats.errors}`);

  return stats;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const days = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '90');

  backfillDailyStats({ days }).then(() => {
    console.log('\nDone!');
  }).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { backfillDailyStats };
