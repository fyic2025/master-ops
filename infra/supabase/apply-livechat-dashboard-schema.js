/**
 * Apply LiveChat Dashboard Schema to BOO Supabase
 * Run: node infra/supabase/apply-livechat-dashboard-schema.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const BOO_SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const BOO_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

async function applySchema() {
  const supabase = createClient(BOO_SUPABASE_URL, BOO_SUPABASE_SERVICE_KEY)

  console.log('Applying LiveChat Dashboard schema to BOO Supabase...\n')

  // Create the AI suggestions table
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS livechat_ai_suggestions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES livechat_conversations(id) ON DELETE CASCADE,
      livechat_chat_id TEXT NOT NULL,
      livechat_thread_id TEXT,
      customer_message_id UUID REFERENCES livechat_messages(id),
      customer_message_text TEXT,
      suggested_reply TEXT NOT NULL,
      edited_reply TEXT,
      context_summary JSONB DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'copied', 'sent', 'rejected', 'expired')),
      approved_by TEXT,
      approved_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      livechat_event_id TEXT,
      send_error TEXT,
      feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
      model_used TEXT DEFAULT 'claude-sonnet-4-20250514',
      tokens_used INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  // Create indexes
  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_conversation ON livechat_ai_suggestions(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON livechat_ai_suggestions(status);
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created ON livechat_ai_suggestions(created_at DESC);
  `

  // Execute via RPC (since direct SQL execution isn't available)
  try {
    // Check if table exists
    const { data: existing, error: checkError } = await supabase
      .from('livechat_ai_suggestions')
      .select('id')
      .limit(1)

    if (checkError && checkError.code === '42P01') {
      console.log('Table does not exist, creating...')
      // Table doesn't exist - we need to create it via SQL editor or migration
      console.log('\n⚠️  Cannot create table via API. Please run this SQL in Supabase SQL Editor:')
      console.log('https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new\n')
      console.log('------- SQL TO RUN -------')
      console.log(createTableSQL)
      console.log(createIndexesSQL)
      console.log('--------------------------\n')
    } else if (checkError) {
      console.error('Error checking table:', checkError)
    } else {
      console.log('✅ Table livechat_ai_suggestions already exists!')
    }

    // Test the existing tables work
    const { count: convCount } = await supabase
      .from('livechat_conversations')
      .select('*', { count: 'exact', head: true })

    const { count: msgCount } = await supabase
      .from('livechat_messages')
      .select('*', { count: 'exact', head: true })

    console.log(`\n📊 Current Data:`)
    console.log(`   - Conversations: ${convCount || 0}`)
    console.log(`   - Messages: ${msgCount || 0}`)

  } catch (err) {
    console.error('Error:', err)
  }
}

applySchema()
