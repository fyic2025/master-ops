#!/usr/bin/env npx tsx
/**
 * Update winback config with Klaviyo list ID
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

async function updateConfig() {
  console.log('\n📝 Updating winback config with Klaviyo list ID...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Get current config
  const { data: current, error: fetchError } = await supabase
    .from('tlx_automation_config')
    .select('*')
    .eq('automation_type', 'winback_40')
    .single()

  if (fetchError) {
    console.error('❌ Error fetching config:', fetchError.message)
    process.exit(1)
  }

  console.log('Current config:')
  console.log(JSON.stringify(current.config, null, 2))

  // Update with Klaviyo list ID
  const newConfig = {
    ...current.config,
    klaviyo_list_id: 'SUMghA',  // Sunset Unengaged (3 months)
    klaviyo_list_name: 'Sunset Unengaged (3 months)'
  }

  const { data, error } = await supabase
    .from('tlx_automation_config')
    .update({
      config: newConfig,
      updated_at: new Date().toISOString()
    })
    .eq('automation_type', 'winback_40')
    .select()
    .single()

  if (error) {
    console.error('❌ Error updating:', error.message)
    process.exit(1)
  }

  console.log('\n✅ Updated config:')
  console.log(JSON.stringify(data.config, null, 2))
}

updateConfig().catch(console.error)
