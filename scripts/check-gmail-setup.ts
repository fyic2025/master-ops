#!/usr/bin/env npx tsx
/**
 * Check Gmail OAuth setup for Teelixir
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config()

const credsPath = path.join(__dirname, '../creds.js')
const creds = require(credsPath)

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

async function checkGmail() {
  console.log('\n📧 Checking Gmail OAuth Setup for Teelixir...\n')

  // 1. Check env vars
  console.log('1. Environment Variables:')
  console.log(`   TEELIXIR_GMAIL_CLIENT_ID: ${process.env.TEELIXIR_GMAIL_CLIENT_ID ? '✅ Set' : '❌ Not set'}`)
  console.log(`   TEELIXIR_GMAIL_CLIENT_SECRET: ${process.env.TEELIXIR_GMAIL_CLIENT_SECRET ? '✅ Set' : '❌ Not set'}`)
  console.log(`   TEELIXIR_GMAIL_REDIRECT_URI: ${process.env.TEELIXIR_GMAIL_REDIRECT_URI || 'Not set (will use default)'}`)

  // 2. Check creds vault
  console.log('\n2. Credentials Vault:')
  await creds.load('teelixir')

  const gmailClientId = await creds.get('teelixir', 'gmail_client_id')
  const gmailClientSecret = await creds.get('teelixir', 'gmail_client_secret')
  const gmailRefreshToken = await creds.get('teelixir', 'gmail_refresh_token')

  console.log(`   gmail_client_id: ${gmailClientId ? '✅ Set' : '❌ Not set'}`)
  console.log(`   gmail_client_secret: ${gmailClientSecret ? '✅ Set' : '❌ Not set'}`)
  console.log(`   gmail_refresh_token: ${gmailRefreshToken ? '✅ Set' : '❌ Not set'}`)

  // 3. Check Supabase for existing connections
  console.log('\n3. Gmail Connections in Supabase:')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Check if table exists
  const { data: connections, error } = await supabase
    .from('tlx_gmail_connections')
    .select('*')

  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('   ❌ Table tlx_gmail_connections does not exist')
      console.log('   Need to create it first.')
    } else {
      console.log(`   ❌ Error: ${error.message}`)
    }
  } else if (!connections || connections.length === 0) {
    console.log('   ⚠️  No Gmail connections found')
  } else {
    console.log(`   Found ${connections.length} connection(s):`)
    for (const conn of connections) {
      console.log(`   - ${conn.email} (Active: ${conn.is_active}, Scopes: ${conn.scopes?.length || 0})`)
    }
  }

  // 4. Instructions
  console.log('\n' + '═'.repeat(70))
  console.log('📋 SETUP INSTRUCTIONS:')
  console.log('═'.repeat(70))

  if (!gmailClientId || !gmailClientSecret) {
    console.log(`
1. Create OAuth credentials in Google Cloud Console:
   - Go to: https://console.cloud.google.com
   - Project: Teelixir or create new
   - APIs & Services > Credentials > Create OAuth Client ID
   - Type: Web application
   - Authorized redirect URIs: https://ops.growthcohq.com/api/auth/gmail/callback
   - Save Client ID and Client Secret

2. Add credentials to creds vault or .env:
   TEELIXIR_GMAIL_CLIENT_ID=xxx
   TEELIXIR_GMAIL_CLIENT_SECRET=xxx
`)
  }

  console.log(`
3. Authorize colette@teelixir.com:
   - Visit: https://ops.growthcohq.com/api/auth/gmail/authorize?email=colette@teelixir.com
   - Or run: npx tsx scripts/gmail-oauth-flow.ts

4. Required OAuth Scopes (must add gmail.send):
   - https://www.googleapis.com/auth/gmail.send
   - https://www.googleapis.com/auth/userinfo.email
   - https://www.googleapis.com/auth/userinfo.profile
`)
}

checkGmail().catch(console.error)
