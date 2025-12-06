#!/usr/bin/env npx tsx
/**
 * Fix missing automation setup - insert config and check view
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

async function fixSetup() {
  console.log('\n🔧 Fixing automation setup...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // 1. Check and insert config if missing
  console.log('1. Checking automation config...')

  const { data: existingConfig } = await supabase
    .from('tlx_automation_config')
    .select('*')
    .eq('automation_type', 'winback_40')
    .single()

  if (existingConfig) {
    console.log('   ✅ Config already exists')
    console.log(`      Enabled: ${existingConfig.enabled}`)
    console.log(`      Config: ${JSON.stringify(existingConfig.config, null, 2)}`)
  } else {
    console.log('   ⚠️  Config missing, inserting...')

    const { data, error } = await supabase
      .from('tlx_automation_config')
      .insert({
        automation_type: 'winback_40',
        enabled: false,
        config: {
          daily_limit: 20,
          discount_code: 'MISSYOU40',
          discount_percent: 40,
          sender_email: 'colette@teelixir.com',
          sender_name: 'Colette from Teelixir',
          subject_template: '{{ first_name }}, we miss you! Here\'s 40% off',
          klaviyo_segment_id: null
        }
      })
      .select()
      .single()

    if (error) {
      console.log(`   ❌ Failed to insert: ${error.message}`)
    } else {
      console.log('   ✅ Config inserted successfully')
    }
  }

  // 2. Check view - if missing, need to run in SQL Editor
  console.log('\n2. Checking stats view...')

  const { data: viewData, error: viewError } = await supabase
    .from('tlx_winback_stats')
    .select('*')
    .single()

  if (viewError && viewError.message.includes('does not exist')) {
    console.log('   ❌ View tlx_winback_stats does not exist')
    console.log('')
    console.log('   Please run this SQL in Supabase SQL Editor:')
    console.log('   https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql')
    console.log('')
    console.log('   ──────────────────────────────────────────────────────────')
    console.log(`
CREATE OR REPLACE VIEW tlx_winback_stats AS
SELECT
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE status = 'clicked') AS total_clicked,
  COUNT(*) FILTER (WHERE status = 'converted') AS total_converted,
  COUNT(*) FILTER (WHERE status = 'bounced') AS total_bounced,
  COUNT(*) FILTER (WHERE status = 'failed') AS total_failed,
  COALESCE(SUM(order_total) FILTER (WHERE status = 'converted'), 0) AS total_revenue,
  COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '24 hours') AS sent_today,
  COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '7 days') AS sent_this_week,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'clicked')::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS click_rate_percent,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'converted')::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS conversion_rate_percent
FROM tlx_winback_emails;
`)
    console.log('   ──────────────────────────────────────────────────────────')
  } else {
    console.log('   ✅ View exists')
    console.log(`      Stats: ${JSON.stringify(viewData, null, 2)}`)
  }

  // 3. Final summary
  console.log('\n📊 Setup Summary:')
  console.log('─'.repeat(50))

  const { data: finalConfig } = await supabase
    .from('tlx_automation_config')
    .select('*')
    .eq('automation_type', 'winback_40')
    .single()

  if (finalConfig) {
    console.log('✅ Configuration ready')
    console.log(`   • Automation: ${finalConfig.automation_type}`)
    console.log(`   • Enabled: ${finalConfig.enabled}`)
    console.log(`   • Daily limit: ${finalConfig.config?.daily_limit}`)
    console.log(`   • Discount: ${finalConfig.config?.discount_code} (${finalConfig.config?.discount_percent}%)`)
    console.log(`   • Sender: ${finalConfig.config?.sender_email}`)
  }
}

fixSetup().catch(console.error)
