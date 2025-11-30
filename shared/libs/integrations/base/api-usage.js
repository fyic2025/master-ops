/**
 * API Usage Tracking Utility
 * Logs API calls to Master Hub Supabase for cost monitoring
 *
 * Usage:
 *   const { logApiUsage } = require('../base/api-usage');
 *   // At end of sync script:
 *   await logApiUsage('google_merchant', 15, 0);
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });

// Master Hub Supabase
const MASTER_HUB_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const MASTER_HUB_SERVICE_KEY = process.env.MASTER_HUB_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

const supabase = createClient(MASTER_HUB_URL, MASTER_HUB_SERVICE_KEY);

/**
 * Log API usage to Master Hub Supabase
 * @param {string} service - Service name (e.g., 'google_merchant', 'gsc', 'xero')
 * @param {number} callCount - Number of API calls made
 * @param {number} errorCount - Number of errors encountered (default: 0)
 * @returns {Promise<boolean>} - Success status
 */
async function logApiUsage(service, callCount, errorCount = 0) {
  if (!callCount || callCount <= 0) return true;

  const today = new Date().toISOString().split('T')[0];

  try {
    // Use RPC to call the increment function
    const { error } = await supabase.rpc('increment_api_usage', {
      p_service: service,
      p_date: today,
      p_calls: callCount,
      p_errors: errorCount
    });

    if (error) {
      // Fallback to direct upsert if RPC doesn't exist yet
      if (error.code === 'PGRST202' || error.message.includes('not exist')) {
        return await directUpsert(service, today, callCount, errorCount);
      }
      console.error(`[API Usage] Failed to log ${service}:`, error.message);
      return false;
    }

    console.log(`[API Usage] Logged ${callCount} calls for ${service} (${errorCount} errors)`);
    return true;
  } catch (err) {
    console.error(`[API Usage] Error logging ${service}:`, err.message);
    return false;
  }
}

/**
 * Direct upsert fallback if RPC function doesn't exist
 */
async function directUpsert(service, date, callCount, errorCount) {
  try {
    // First try to get existing record
    const { data: existing } = await supabase
      .from('api_usage_daily')
      .select('id, call_count, error_count')
      .eq('service', service)
      .eq('usage_date', date)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('api_usage_daily')
        .update({
          call_count: existing.call_count + callCount,
          error_count: existing.error_count + errorCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('api_usage_daily')
        .insert({
          service,
          usage_date: date,
          call_count: callCount,
          error_count: errorCount
        });

      if (error) throw error;
    }

    console.log(`[API Usage] Logged ${callCount} calls for ${service} (fallback)`);
    return true;
  } catch (err) {
    console.error(`[API Usage] Fallback upsert failed:`, err.message);
    return false;
  }
}

/**
 * Get usage summary for dashboard
 * @returns {Promise<Array>} Usage summary by service
 */
async function getUsageSummary() {
  try {
    const { data, error } = await supabase
      .from('api_usage_summary')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[API Usage] Failed to get summary:', err.message);
    return [];
  }
}

/**
 * Service name constants for consistency
 */
const SERVICES = {
  GOOGLE_MERCHANT: 'google_merchant',
  GMC_PERFORMANCE: 'gmc_performance',
  GSC: 'gsc',
  GSC_INSPECTION: 'gsc_inspection',
  XERO: 'xero',
  BIGCOMMERCE: 'bigcommerce',
  SHOPIFY: 'shopify',
  WOOCOMMERCE: 'woocommerce',
  LIVECHAT: 'livechat',
  HUBSPOT: 'hubspot',
  UNLEASHED: 'unleashed'
};

module.exports = {
  logApiUsage,
  getUsageSummary,
  SERVICES
};
