#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'
)

async function updateConfig() {
  // First get current config
  const { data: current } = await supabase
    .from('tlx_automation_config')
    .select('config')
    .eq('automation_type', 'winback_40')
    .single()

  console.log('Current config:', JSON.stringify(current?.config, null, 2))

  // Update with new fields
  const newConfig = {
    ...current?.config,
    reply_to_email: 'sales@teelixir.com',
    default_name: 'there'
  }

  const { error } = await supabase
    .from('tlx_automation_config')
    .update({ config: newConfig })
    .eq('automation_type', 'winback_40')

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('\n✅ Updated config:', JSON.stringify(newConfig, null, 2))
  }
}

updateConfig()
