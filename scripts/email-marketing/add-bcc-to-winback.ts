#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'
)

async function addBcc() {
  // Get current config
  const { data: current } = await supabase
    .from('tlx_automation_config')
    .select('config')
    .eq('automation_type', 'winback_40')
    .single()

  // Add BCC email
  const newConfig = {
    ...current?.config,
    bcc_email: 'jayson@teelixir.com'
  }

  const { error } = await supabase
    .from('tlx_automation_config')
    .update({ config: newConfig })
    .eq('automation_type', 'winback_40')

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('✅ BCC added: jayson@teelixir.com')
    console.log('\nAll emails will now be BCC\'d to you.')
    console.log('To remove BCC later, set bcc_email to null in Supabase.')
  }
}

addBcc()
