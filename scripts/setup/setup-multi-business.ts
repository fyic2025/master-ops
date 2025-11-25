/**
 * Multi-Business Setup Script
 * Sets up Supabase for managing multiple businesses
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setupMultiBusiness() {
  console.log('🔧 Setting up Multi-Business Architecture...\n')

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, 'infra', 'supabase', 'multi-business-setup.sql')
    const sql = readFileSync(sqlPath, 'utf-8')

    console.log('📄 SQL loaded from:', sqlPath)
    console.log('\n📋 MANUAL SETUP REQUIRED:')
    console.log('=' .repeat(60))
    console.log('\n1. Go to: https://supabase.com/dashboard')
    console.log('2. Select your project')
    console.log('3. Click SQL Editor → New query')
    console.log('4. Copy the contents of:\n')
    console.log('   ' + sqlPath)
    console.log('\n5. Paste and click RUN')
    console.log('\n' + '=' .repeat(60))

    // After they run SQL, verify setup
    console.log('\n\n✅ After running SQL, verify with:')
    console.log('   npx tsx verify-multi-business.ts\n')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

setupMultiBusiness()
