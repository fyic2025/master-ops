/**
 * Sync businesses from Supabase to HubSpot
 * Handles batch processing and error tracking
 */

import { supabase } from './infra/supabase/client';
import { hubspotClient } from './shared/libs/hubspot';

// Field mapping from Supabase to HubSpot
// NOTE: HubSpot field names use underscores (lead_id_1, open_rate_1)
const FIELD_MAPPING = {
  // Standard fields
  name: 'name',  // Required
  phone: 'phone',
  website: 'website',
  city: 'city',
  postcode: 'zip',
  state: 'state',

  // Custom fields (exact matches)
  lead_id: 'lead_id_1',  // Maps to lead_id_1 in HubSpot (unique identifier)
  email: 'email',
  instagram: 'instagram_profile',
  primary_category: 'primary_business_category',
  // business_name: 'business_name', // EXCLUDED: unique constraint + duplicate values in data
  short_business_name: 'short_business_name',
  assigned_category: 'assigned_category',
  category_score: 'category_score',
  can_sms: 'can_sms',

  // Email engagement fields
  emails_sent: 'total_emails_sent',
  emails_opened: 'total_emails_opened',
  emails_clicked: 'total_emails_clicked',
  emails_replied: 'total_emails_replied',
  emails_bounced: 'total_emails_bounced',
  open_rate: 'open_rate_1',  // Maps to open_rate_1 in HubSpot
  click_rate: 'click_rate',
  reply_rate: 'reply_rate',
  bounce_rate: 'bounce_rate',
  email_engagement_score: 'email_engagement_score',
  // email_engagement_status: 'email_engagement_status', // EXCLUDED: value mapping issue (sent/opened vs active/inactive/bounced/unsubscribed)
  engagement_score: 'engagement_score',

  // Boolean/enum fields
  is_opened: 'is_opened',
  is_clicked: 'is_clicked',
  is_replied: 'is_replied',
  is_bounced: 'is_bounced',
  is_beauty_salon: 'is_beauty_salon',
  is_cosmetic_clinic: 'is_cosmetic_clinic',
  is_fitness_studio: 'is_fitness_studio',
  is_yoga_mindfulness: 'is_yoga_mindfulness',
  is_acupuncture_chinese_med: 'is_acupuncture_chinese_medicine',
  is_health_supplement_retail: 'is_health_supplement_retail',
  is_makeup_brows: 'is_makeup_and_brows_company',
  is_other_mixed_services: 'is_other_or_mixed_services',

  // Category fields
  is_massage: 'massage_services_category',
  is_spa_and_wellness: 'spa_and_wellness_category',
  is_chiropractic_osteo: 'chiropractic_and_osteopathy_category',
  is_naturopath_holistic: 'naturopathy_and_holistic_health_category',
  is_reiki_energy_healing: 'reiki_and_energy_healing_category',
  is_hair_services: 'hair_services',
  is_tanning_body_contour: 'tanning_and_body_contouring_category_flag',
  is_boutique_accommodation: 'boutique_accommodation',
  is_laser_skin_treatment: 'laser_skin_treatment_association',

  // Dates
  last_opened_at: 'last_opened_at',
  last_clicked_at: 'last_clicked_at',
  last_replied_at: 'last_replied_at',
  updated_at: 'updated_at',
  // smartlead_sync_date: 'smartlead_sync_date', // EXCLUDED: date format issue - needs conversion

  // Other
  google_id: 'google_business_profile_id',
  smartlead_campaigns: 'smartlead_campaigns',
};

// Fields that use "true"/"false" instead of "yes"/"no" for boolean values
// Most fields use "yes"/"no", only these specific ones use "true"/"false"
const TRUE_FALSE_FIELDS = new Set([
  'is_replied',
  'can_sms',
]);

function mapBusinessToHubSpot(business: any) {
  const properties: any = {};

  // Map standard and custom fields
  Object.entries(FIELD_MAPPING).forEach(([supabaseField, hubspotField]) => {
    const value = business[supabaseField];

    if (value !== null && value !== undefined) {
      // Convert arrays to comma-separated strings
      if (Array.isArray(value)) {
        properties[hubspotField] = value.join(', ');
      }
      // Convert booleans to strings
      else if (typeof value === 'boolean') {
        // Some fields use "true"/"false", others use "yes"/"no"
        if (TRUE_FALSE_FIELDS.has(hubspotField)) {
          properties[hubspotField] = value ? 'true' : 'false';
        } else {
          properties[hubspotField] = value ? 'yes' : 'no';
        }
      }
      // Convert dates to midnight UTC timestamps (HubSpot requirement)
      else if (supabaseField.includes('_at') && value) {
        const date = new Date(value);
        // Set to midnight UTC
        date.setUTCHours(0, 0, 0, 0);
        properties[hubspotField] = date.getTime();
      }
      // Regular values
      else {
        properties[hubspotField] = value;
      }
    }
  });

  // Add metadata as JSON string if needed
  if (business.metadata) {
    const metadata = business.metadata;
    if (metadata.address) properties.address = metadata.address;
    if (metadata.country) properties.country = metadata.country;
  }

  // Ensure name is set (required field)
  if (!properties.name && business.name) {
    properties.name = business.name;
  }

  // Use website as domain if available
  if (business.website && !properties.domain) {
    try {
      const url = new URL(business.website.startsWith('http') ? business.website : `https://${business.website}`);
      properties.domain = url.hostname.replace('www.', '');
    } catch (e) {
      // Invalid URL, skip
    }
  }

  return properties;
}

async function syncBatch(businesses: any[], batchNumber: number, totalBatches: number) {
  console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${businesses.length} companies)...`);

  const results = {
    success: 0,
    failed: 0,
    errors: [] as any[],
  };

  // Process in smaller sub-batches of 10 (HubSpot API limit for batch create)
  for (let i = 0; i < businesses.length; i += 10) {
    const subBatch = businesses.slice(i, i + 10);

    try {
      const inputs = subBatch.map(business => ({
        properties: mapBusinessToHubSpot(business),
      }));

      // Create companies in batch
      const response = await hubspotClient.client.crm.companies.batchApi.create({
        inputs,
      });

      results.success += response.results.length;

      // Update Supabase with HubSpot IDs
      for (let j = 0; j < response.results.length; j++) {
        const hubspotCompany = response.results[j];
        const business = subBatch[j];

        await supabase
          .from('businesses')
          .update({
            hubspot_company_id: hubspotCompany.id,
            hubspot_sync_status: 'synced',
            hubspot_synced_at: new Date().toISOString(),
            hubspot_sync_error: null,
          })
          .eq('lead_id', business.lead_id);
      }

      console.log(`   ✅ Sub-batch ${Math.floor(i/10) + 1} completed (${response.results.length} companies)`);

    } catch (error: any) {
      results.failed += subBatch.length;

      // Log error details
      const errorMessage = error.message || String(error);
      console.error(`   ❌ Sub-batch ${Math.floor(i/10) + 1} failed:`, errorMessage);

      // Update Supabase with error status
      for (const business of subBatch) {
        await supabase
          .from('businesses')
          .update({
            hubspot_sync_status: 'error',
            hubspot_sync_error: errorMessage.substring(0, 1000), // Limit error message length
          })
          .eq('lead_id', business.lead_id);

        results.errors.push({
          lead_id: business.lead_id,
          name: business.name,
          error: errorMessage,
        });
      }
    }

    // Rate limiting: wait 100ms between sub-batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

async function syncAllBusinesses(options: {
  batchSize?: number;
  limit?: number;
  testMode?: boolean;
  status?: string;
}) {
  const { batchSize = 100, limit, testMode = false, status } = options;

  console.log('🚀 Starting businesses sync to HubSpot...\n');

  if (testMode) {
    console.log('⚠️  TEST MODE: Will only sync first batch\n');
  }

  try {
    // Get businesses to sync
    let query = supabase
      .from('businesses')
      .select('*')
      .or('hubspot_sync_status.is.null,hubspot_sync_status.eq.error,hubspot_sync_status.eq.pending');

    if (status) {
      query = query.eq('status', status);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: businesses, error } = await query;

    if (error) throw error;

    if (!businesses || businesses.length === 0) {
      console.log('ℹ️  No businesses to sync');
      return;
    }

    console.log(`📊 Found ${businesses.length} businesses to sync\n`);

    // Calculate batches
    const totalBatches = Math.ceil(businesses.length / batchSize);
    const overallResults = {
      total: businesses.length,
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process in batches
    for (let i = 0; i < businesses.length; i += batchSize) {
      if (testMode && i > 0) {
        console.log('\n⚠️  Test mode - stopping after first batch');
        break;
      }

      const batch = businesses.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      const results = await syncBatch(batch, batchNumber, totalBatches);

      overallResults.success += results.success;
      overallResults.failed += results.failed;
      overallResults.errors.push(...results.errors);

      console.log(`   📊 Batch ${batchNumber} summary: ${results.success} success, ${results.failed} failed`);

      // Wait 1 second between batches to avoid rate limits
      if (i + batchSize < businesses.length) {
        console.log('   ⏳ Waiting 1s before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✨ SYNC COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total businesses: ${overallResults.total}`);
    console.log(`✅ Successfully synced: ${overallResults.success}`);
    console.log(`❌ Failed: ${overallResults.failed}`);
    console.log(`📊 Success rate: ${((overallResults.success / overallResults.total) * 100).toFixed(2)}%`);

    if (overallResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      overallResults.errors.slice(0, 10).forEach(err => {
        console.log(`   - ${err.lead_id} (${err.name}): ${err.error}`);
      });
      if (overallResults.errors.length > 10) {
        console.log(`   ... and ${overallResults.errors.length - 10} more errors`);
      }
    }

    return overallResults;

  } catch (error) {
    console.error('\n❌ Fatal error during sync:', error);
    throw error;
  }
}

// CLI options
const args = process.argv.slice(2);
const testMode = args.includes('--test');
const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
const status = args.find(arg => arg.startsWith('--status='))?.split('=')[1];

syncAllBusinesses({
  batchSize: 100,
  limit: limit ? parseInt(limit) : undefined,
  testMode,
  status,
})
  .then(results => {
    if (results) {
      console.log('\n✅ Sync completed successfully!');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Sync failed');
    process.exit(1);
  });
