#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'
)

async function enableAutomation() {
  const { data, error } = await supabase
    .from('tlx_automation_config')
    .update({ enabled: true })
    .eq('automation_type', 'winback_40')
    .select()
    .single()

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('✅ Winback automation ENABLED')
    console.log('   Status:', data.enabled ? 'Active' : 'Inactive')
  }
}

enableAutomation()
