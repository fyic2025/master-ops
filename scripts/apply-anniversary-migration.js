const creds = require('../creds');
const https = require('https');

async function execSQL(sql) {
  const key = await creds.get('global', 'master_supabase_service_role_key');

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const options = {
      hostname: 'qcvfxxsnqvdfmpbcgdni.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': 'Bearer ' + key
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  // 1. Create indexes
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_tlx_anniv_email ON tlx_anniversary_discounts(LOWER(email))",
    "CREATE INDEX IF NOT EXISTS idx_tlx_anniv_status ON tlx_anniversary_discounts(status)",
    "CREATE INDEX IF NOT EXISTS idx_tlx_anniv_code ON tlx_anniversary_discounts(discount_code)",
    "CREATE INDEX IF NOT EXISTS idx_tlx_anniv_klaviyo ON tlx_anniversary_discounts(klaviyo_profile_id)",
    "CREATE INDEX IF NOT EXISTS idx_tlx_anniv_expires ON tlx_anniversary_discounts(expires_at) WHERE status = 'active'",
    "CREATE INDEX IF NOT EXISTS idx_tlx_anniv_shopify_customer ON tlx_anniversary_discounts(shopify_customer_id)"
  ];

  console.log('Creating indexes...');
  for (const idx of indexes) {
    const r = await execSQL(idx);
    console.log('  Index:', r.status === 200 ? 'OK' : r.body);
  }

  // 2. Update config with min_sample_size: 15
  console.log('\nUpdating anniversary config...');
  const configSQL = `
    UPDATE tlx_automation_config SET
      config = config || '{"min_sample_size": 15}'::jsonb,
      updated_at = NOW()
    WHERE automation_type = 'anniversary_15'
  `;
  const r = await execSQL(configSQL);
  console.log('  Config update:', r.status === 200 ? 'OK' : r.body);

  // 3. Create stats view
  console.log('\nCreating stats view...');
  const viewSQL = `
CREATE OR REPLACE VIEW tlx_anniversary_stats AS
SELECT
  COUNT(*) AS total_generated,
  COUNT(*) FILTER (WHERE status = 'active') AS active_codes,
  COUNT(*) FILTER (WHERE status = 'sent') AS sent_codes,
  COUNT(*) FILTER (WHERE status = 'used') AS used_codes,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired_codes,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_codes,
  COALESCE(SUM(converted_order_total) FILTER (WHERE status = 'used'), 0) AS total_revenue,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS generated_today,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS generated_this_week,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'used')::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'used', 'expired')), 0)) * 100,
    2
  ) AS conversion_rate_percent,
  ROUND(
    COALESCE(SUM(converted_order_total) FILTER (WHERE status = 'used'), 0) /
    NULLIF(COUNT(*) FILTER (WHERE status = 'used'), 0),
    2
  ) AS avg_order_value,
  COUNT(*) FILTER (WHERE timing_match_type = 'product_size') AS matched_product_size,
  COUNT(*) FILTER (WHERE timing_match_type = 'size_only') AS matched_size_only,
  COUNT(*) FILTER (WHERE timing_match_type = 'global') AS matched_global
FROM tlx_anniversary_discounts
  `;
  const rv = await execSQL(viewSQL);
  console.log('  Stats view:', rv.status === 200 ? 'OK' : rv.body);

  // 4. Create expire function
  console.log('\nCreating expire function...');
  const expireFunc = `
CREATE OR REPLACE FUNCTION expire_anniversary_codes()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE tlx_anniversary_discounts
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE
    status IN ('active', 'sent')
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql
  `;
  const rf = await execSQL(expireFunc);
  console.log('  Expire function:', rf.status === 200 ? 'OK' : rf.body);

  // 5. Create get_anniversary_email_day function
  console.log('\nCreating email day function...');
  const emailDayFunc = `
CREATE OR REPLACE FUNCTION get_anniversary_email_day(
  p_product_type TEXT,
  p_product_size INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  result_day INTEGER;
  config_row RECORD;
BEGIN
  SELECT config INTO config_row FROM tlx_automation_config WHERE automation_type = 'anniversary_15';

  SELECT email_send_day INTO result_day
  FROM tlx_reorder_timing
  WHERE product_type = p_product_type
    AND product_size_grams = p_product_size
    AND sample_size >= (config_row.config->>'min_sample_size')::INTEGER;

  IF result_day IS NOT NULL THEN
    RETURN result_day;
  END IF;

  SELECT email_send_day INTO result_day
  FROM tlx_reorder_timing
  WHERE product_type IS NULL
    AND product_size_grams = p_product_size
    AND sample_size >= (config_row.config->>'min_sample_size')::INTEGER;

  IF result_day IS NOT NULL THEN
    RETURN result_day;
  END IF;

  SELECT email_send_day INTO result_day
  FROM tlx_reorder_timing
  WHERE product_type IS NULL
    AND product_size_grams IS NULL;

  IF result_day IS NOT NULL THEN
    RETURN result_day;
  END IF;

  RETURN COALESCE(
    (config_row.config->>'global_fallback_days')::INTEGER - (config_row.config->>'lead_days')::INTEGER,
    55
  );
END;
$$ LANGUAGE plpgsql
  `;
  const re = await execSQL(emailDayFunc);
  console.log('  Email day function:', re.status === 200 ? 'OK' : re.body);

  // 6. Create candidates view
  console.log('\nCreating candidates view...');
  const candidatesView = `
CREATE OR REPLACE VIEW v_tlx_anniversary_candidates AS
SELECT
  f.shopify_customer_id,
  f.shopify_order_id,
  f.customer_email,
  f.customer_first_name,
  f.first_order_date,
  f.first_order_value,
  f.days_since_first_order,
  f.primary_product_type,
  f.primary_product_size,
  get_anniversary_email_day(f.primary_product_type, f.primary_product_size) as email_send_day,
  CASE
    WHEN rt.product_type IS NOT NULL AND rt.product_size_grams IS NOT NULL THEN 'product_size'
    WHEN rt.product_size_grams IS NOT NULL THEN 'size_only'
    ELSE 'global'
  END as timing_match_type
FROM v_tlx_first_order_no_reorder f
LEFT JOIN tlx_reorder_timing rt ON (
  (rt.product_type = f.primary_product_type AND rt.product_size_grams = f.primary_product_size)
  OR (rt.product_type IS NULL AND rt.product_size_grams = f.primary_product_size)
  OR (rt.product_type IS NULL AND rt.product_size_grams IS NULL)
)
WHERE f.days_since_first_order >= get_anniversary_email_day(f.primary_product_type, f.primary_product_size)
  AND NOT EXISTS (
    SELECT 1 FROM tlx_anniversary_discounts ad
    WHERE ad.shopify_customer_id = f.shopify_customer_id::TEXT
  )
  AND NOT EXISTS (
    SELECT 1 FROM tlx_winback_emails w
    WHERE LOWER(w.email) = LOWER(f.customer_email)
  )
  `;
  const rc = await execSQL(candidatesView);
  console.log('  Candidates view:', rc.status === 200 ? 'OK' : rc.body);

  // 7. Enable RLS
  console.log('\nEnabling RLS...');
  const rls1 = await execSQL('ALTER TABLE tlx_anniversary_discounts ENABLE ROW LEVEL SECURITY');
  console.log('  RLS enabled:', rls1.status === 200 ? 'OK' : rls1.body);

  const rls2 = await execSQL(`
    CREATE POLICY "Service role has full access to tlx_anniversary_discounts"
    ON tlx_anniversary_discounts FOR ALL
    USING (auth.role() = 'service_role')
  `);
  console.log('  RLS policy:', rls2.status === 200 ? 'OK' : rls2.body);

  // 8. Add job monitoring entries
  console.log('\nAdding job monitoring...');
  const jobs = [
    {
      job_name: 'shopify-order-sync',
      job_type: 'sync',
      business: 'teelixir',
      schedule: 'Daily 4AM AEST',
      description: 'Syncs Shopify orders to Supabase for reorder analysis',
      expected_interval_hours: 25,
      relevant_files: ['teelixir/scripts/sync-shopify-orders.ts']
    },
    {
      job_name: 'anniversary-emails',
      job_type: 'automation',
      business: 'teelixir',
      schedule: 'Daily 9AM AEST',
      description: 'Sends anniversary emails with unique 15% discount codes to first-time buyers',
      expected_interval_hours: 25,
      relevant_files: ['teelixir/scripts/send-anniversary-emails.ts']
    },
    {
      job_name: 'reorder-timing-refresh',
      job_type: 'analysis',
      business: 'teelixir',
      schedule: 'Monthly 1st at 5AM AEST',
      description: 'Updates email timing based on latest reorder patterns - adaptive learning',
      expected_interval_hours: 750,
      relevant_files: ['teelixir/scripts/refresh-reorder-timing.ts']
    }
  ];

  for (const job of jobs) {
    const insertSQL = `
      INSERT INTO dashboard_job_status (
        job_name, job_type, business, schedule, description,
        expected_interval_hours, relevant_files, status
      ) VALUES (
        '${job.job_name}', '${job.job_type}', '${job.business}', '${job.schedule}',
        '${job.description}', ${job.expected_interval_hours},
        ARRAY['${job.relevant_files.join("','")}'], 'unknown'
      ) ON CONFLICT (job_name) DO NOTHING
    `;
    const rj = await execSQL(insertSQL);
    console.log(`  Job ${job.job_name}:`, rj.status === 200 ? 'OK' : rj.body);
  }

  console.log('\n✅ Migration complete!');
}

run().catch(console.error);
