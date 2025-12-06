#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'
)

async function addWinbackJobs() {
  console.log('Adding winback jobs to monitoring...\n')

  const jobs = [
    {
      job_name: 'winback-klaviyo-sync',
      job_type: 'cron',
      business: 'teelixir',
      schedule: 'Daily 6:00 AM AEST',
      description: 'Sync unengaged profiles from Klaviyo to Supabase pool',
      expected_interval_hours: 24,
      relevant_files: ['teelixir/scripts/sync-klaviyo-unengaged.ts'],
      status: 'unknown'
    },
    {
      job_name: 'winback-email-send',
      job_type: 'cron',
      business: 'teelixir',
      schedule: 'Daily 9:00 AM AEST',
      description: 'Send 40% winback emails to unengaged customers (20/day)',
      expected_interval_hours: 24,
      relevant_files: ['teelixir/scripts/send-winback-emails.ts'],
      status: 'unknown'
    },
    {
      job_name: 'winback-conversion-reconcile',
      job_type: 'cron',
      business: 'teelixir',
      schedule: 'Daily 6:00 PM AEST',
      description: 'Check Shopify orders for MISSYOU40 conversions',
      expected_interval_hours: 24,
      relevant_files: ['teelixir/scripts/reconcile-winback-conversions.ts'],
      status: 'unknown'
    }
  ]

  for (const job of jobs) {
    const { error } = await supabase
      .from('dashboard_job_status')
      .upsert(job, { onConflict: 'job_name,business' })

    if (error) {
      console.error(`❌ Error adding ${job.job_name}:`, error.message)
    } else {
      console.log(`✅ Added: ${job.job_name}`)
    }
  }

  // List all Teelixir jobs
  const { data } = await supabase
    .from('dashboard_job_status')
    .select('job_name, status, schedule, description')
    .eq('business', 'teelixir')
    .order('job_name')

  console.log('\n📋 All Teelixir Jobs:')
  console.log('─'.repeat(70))
  for (const job of data || []) {
    console.log(`${job.job_name}`)
    console.log(`   Schedule: ${job.schedule}`)
    console.log(`   Status: ${job.status}`)
    console.log(`   ${job.description}`)
    console.log('')
  }
}

addWinbackJobs()
