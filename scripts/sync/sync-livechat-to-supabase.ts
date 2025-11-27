#!/usr/bin/env npx tsx
/**
 * Sync LiveChat to Supabase
 *
 * Pulls chat history from LiveChat and stores it in Supabase.
 * Supports incremental sync (only new chats since last sync) or full sync.
 *
 * Usage:
 *   npx tsx scripts/sync/sync-livechat-to-supabase.ts                  # Incremental (last 7 days)
 *   npx tsx scripts/sync/sync-livechat-to-supabase.ts --days 30        # Last 30 days
 *   npx tsx scripts/sync/sync-livechat-to-supabase.ts --full           # Full sync (12 months)
 *   npx tsx scripts/sync/sync-livechat-to-supabase.ts --from 2024-01-01 --to 2024-06-30
 *
 * Environment Variables:
 *   LIVECHAT_ACCOUNT_ID     - LiveChat Account ID
 *   LIVECHAT_PAT_BASE64     - LiveChat PAT (Base64 encoded as account_id:pat)
 *   SUPABASE_URL            - BOO Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY - BOO Supabase Service Role Key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { LiveChatConnector } from '../../shared/libs/integrations/livechat'
import type {
  LiveChatConversationRecord,
  LiveChatMessageRecord,
  LiveChatThread,
  LiveChatUser,
  LiveChatEvent,
} from '../../shared/libs/integrations/livechat'

// =============================================================================
// Configuration
// =============================================================================

interface SyncConfig {
  fromDate: Date
  toDate: Date
  fullSync: boolean
  dryRun: boolean
  verbose: boolean
}

function parseArgs(): SyncConfig {
  const args = process.argv.slice(2)
  const config: SyncConfig = {
    fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default: 7 days ago
    toDate: new Date(),
    fullSync: false,
    dryRun: false,
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--full') {
      config.fullSync = true
      config.fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 12 months
    } else if (arg === '--days' && args[i + 1]) {
      const days = parseInt(args[++i], 10)
      config.fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    } else if (arg === '--from' && args[i + 1]) {
      config.fromDate = new Date(args[++i])
    } else if (arg === '--to' && args[i + 1]) {
      config.toDate = new Date(args[++i])
    } else if (arg === '--dry-run') {
      config.dryRun = true
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
LiveChat to Supabase Sync

Usage:
  npx tsx scripts/sync/sync-livechat-to-supabase.ts [options]

Options:
  --days <n>      Sync last N days (default: 7)
  --full          Full sync (last 12 months)
  --from <date>   Start date (ISO format)
  --to <date>     End date (ISO format)
  --dry-run       Show what would be synced without writing
  --verbose, -v   Verbose output
  --help, -h      Show this help
      `)
      process.exit(0)
    }
  }

  return config
}

// =============================================================================
// Initialization
// =============================================================================

function getEnvOrThrow(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function initLiveChatConnector(): LiveChatConnector {
  return new LiveChatConnector({
    accountId: getEnvOrThrow('LIVECHAT_ACCOUNT_ID'),
    entityId: process.env.LIVECHAT_ENTITY_ID || '',
    patBase64: getEnvOrThrow('LIVECHAT_PAT_BASE64'),
  })
}

function initSupabase(): SupabaseClient {
  return createClient(
    getEnvOrThrow('SUPABASE_URL'),
    getEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY')
  )
}

// =============================================================================
// Transformation
// =============================================================================

function transformToConversationRecord(
  chat: {
    id: string
    users: LiveChatUser[]
    thread: LiveChatThread
    properties?: Record<string, Record<string, any>>
  }
): LiveChatConversationRecord {
  const customer = chat.users.find(u => u.type === 'customer')
  const agent = chat.users.find(u => u.type === 'agent')
  const thread = chat.thread
  const events = thread.events || []

  // Count messages
  let messageCount = 0
  let customerMessageCount = 0
  let agentMessageCount = 0
  let firstCustomerMessageTime: Date | undefined
  let firstAgentResponseTime: Date | undefined

  for (const event of events) {
    if (event.type === 'message') {
      messageCount++
      const isCustomer = customer && event.author_id === customer.id

      if (isCustomer) {
        customerMessageCount++
        if (!firstCustomerMessageTime) {
          firstCustomerMessageTime = new Date(event.created_at)
        }
      } else {
        agentMessageCount++
        if (!firstAgentResponseTime && firstCustomerMessageTime) {
          firstAgentResponseTime = new Date(event.created_at)
        }
      }
    }
  }

  // Calculate first response time
  let firstResponseTimeSeconds: number | undefined
  if (firstCustomerMessageTime && firstAgentResponseTime) {
    firstResponseTimeSeconds = Math.round(
      (firstAgentResponseTime.getTime() - firstCustomerMessageTime.getTime()) / 1000
    )
  }

  // Calculate duration
  let durationSeconds: number | undefined
  if (thread.created_at && thread.closed_at) {
    durationSeconds = Math.round(
      (new Date(thread.closed_at).getTime() - new Date(thread.created_at).getTime()) / 1000
    )
  }

  // Extract tags from properties if present
  const tags = chat.properties?.routing?.['tags'] || []

  return {
    livechat_id: chat.id,
    thread_id: thread.id,
    customer_name: customer?.name,
    customer_email: customer?.email,
    customer_id: customer?.id,
    agent_name: agent?.name,
    agent_email: agent?.email,
    agent_id: agent?.id,
    started_at: thread.created_at,
    ended_at: thread.closed_at,
    duration_seconds: durationSeconds,
    status: thread.active ? 'active' : 'closed',
    message_count: messageCount,
    customer_message_count: customerMessageCount,
    agent_message_count: agentMessageCount,
    first_response_time_seconds: firstResponseTimeSeconds,
    tags: Array.isArray(tags) ? tags : [],
    custom_variables: {},
    metadata: {
      properties: chat.properties,
      access: chat.thread.access,
    },
  }
}

function transformToMessageRecords(
  conversationId: string,
  thread: LiveChatThread,
  users: LiveChatUser[]
): Omit<LiveChatMessageRecord, 'conversation_id'>[] {
  const customer = users.find(u => u.type === 'customer')
  const events = thread.events || []

  return events.map(event => {
    // Determine author type
    let authorType: 'customer' | 'agent' | 'system' | 'bot' = 'system'
    let authorName: string | undefined

    if (event.type === 'system_message') {
      authorType = 'system'
    } else {
      const author = users.find(u => u.id === event.author_id)
      if (author) {
        authorType = author.type === 'customer' ? 'customer' : 'agent'
        authorName = author.name
      }
    }

    // Map event type
    let messageType: 'message' | 'system' | 'event' | 'file' | 'rich_message' = 'event'
    switch (event.type) {
      case 'message':
        messageType = 'message'
        break
      case 'system_message':
        messageType = 'system'
        break
      case 'file':
        messageType = 'file'
        break
      case 'rich_message':
        messageType = 'rich_message'
        break
    }

    // Extract content and attachments
    const content = (event as any).text || (event as any).message || ''
    const attachments: any[] = []

    if (event.type === 'file') {
      attachments.push({
        name: (event as any).name,
        url: (event as any).url,
        content_type: (event as any).content_type,
        size: (event as any).size,
      })
    }

    return {
      livechat_message_id: event.id,
      message_type: messageType,
      author_type: authorType,
      author_id: event.author_id,
      author_name: authorName,
      content,
      content_type: event.type === 'file' ? 'file' : 'text',
      attachments,
      created_at_livechat: event.created_at,
      metadata: {
        properties: event.properties,
      },
    }
  })
}

// =============================================================================
// Database Operations
// =============================================================================

async function upsertConversation(
  supabase: SupabaseClient,
  record: LiveChatConversationRecord
): Promise<string> {
  // Check if conversation exists
  const { data: existing } = await supabase
    .from('livechat_conversations')
    .select('id')
    .eq('livechat_id', record.livechat_id)
    .single()

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('livechat_conversations')
      .update({
        ...record,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) throw error
    return existing.id
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('livechat_conversations')
      .insert({
        ...record,
        last_synced_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }
}

async function upsertMessages(
  supabase: SupabaseClient,
  conversationId: string,
  messages: Omit<LiveChatMessageRecord, 'conversation_id'>[]
): Promise<number> {
  if (messages.length === 0) return 0

  // Get existing message IDs for this conversation
  const { data: existing } = await supabase
    .from('livechat_messages')
    .select('livechat_message_id')
    .eq('conversation_id', conversationId)

  const existingIds = new Set(existing?.map(m => m.livechat_message_id) || [])

  // Filter to only new messages
  const newMessages = messages.filter(m => !existingIds.has(m.livechat_message_id))

  if (newMessages.length === 0) return 0

  // Insert new messages
  const { error } = await supabase
    .from('livechat_messages')
    .insert(
      newMessages.map(m => ({
        ...m,
        conversation_id: conversationId,
      }))
    )

  if (error) throw error
  return newMessages.length
}

// =============================================================================
// Main Sync Logic
// =============================================================================

async function syncLiveChat(config: SyncConfig): Promise<void> {
  console.log('='.repeat(60))
  console.log('LiveChat to Supabase Sync')
  console.log('='.repeat(60))
  console.log(`Date range: ${config.fromDate.toISOString()} to ${config.toDate.toISOString()}`)
  console.log(`Mode: ${config.fullSync ? 'Full Sync' : 'Incremental'}`)
  console.log(`Dry run: ${config.dryRun}`)
  console.log('')

  // Initialize clients
  console.log('Initializing clients...')
  const livechat = initLiveChatConnector()
  const supabase = initSupabase()

  // Test connections
  console.log('Testing LiveChat connection...')
  const health = await livechat.healthCheck()
  if (!health.healthy) {
    throw new Error(`LiveChat health check failed: ${health.details?.error}`)
  }
  console.log('✓ LiveChat connected')

  console.log('Testing Supabase connection...')
  const { error: supabaseError } = await supabase.from('livechat_conversations').select('id').limit(1)
  if (supabaseError && !supabaseError.message.includes('does not exist')) {
    throw new Error(`Supabase connection failed: ${supabaseError.message}`)
  }
  console.log('✓ Supabase connected')
  console.log('')

  // Fetch archives from LiveChat
  console.log('Fetching chat archives from LiveChat...')
  const archives = await livechat.listAllArchives(
    {
      filters: {
        from: config.fromDate.toISOString(),
        to: config.toDate.toISOString(),
      },
      sort_order: 'desc',
    },
    (fetched, total) => {
      process.stdout.write(`\r  Fetched ${fetched}/${total} chats...`)
    }
  )
  console.log(`\n✓ Fetched ${archives.length} chats`)
  console.log('')

  if (config.dryRun) {
    console.log('DRY RUN - Would sync the following:')
    for (const chat of archives.slice(0, 10)) {
      const customer = chat.users.find(u => u.type === 'customer')
      console.log(`  - ${chat.id}: ${customer?.name || 'Unknown'} (${customer?.email || 'no email'})`)
    }
    if (archives.length > 10) {
      console.log(`  ... and ${archives.length - 10} more`)
    }
    return
  }

  // Sync each chat
  console.log('Syncing to Supabase...')
  let conversationsSynced = 0
  let messagesSynced = 0
  let errors = 0

  for (let i = 0; i < archives.length; i++) {
    const chat = archives[i]
    const progress = `[${i + 1}/${archives.length}]`

    try {
      // Transform and upsert conversation
      const conversationRecord = transformToConversationRecord(chat)
      const conversationId = await upsertConversation(supabase, conversationRecord)
      conversationsSynced++

      // Transform and upsert messages
      const messageRecords = transformToMessageRecords(conversationId, chat.thread, chat.users)
      const newMessages = await upsertMessages(supabase, conversationId, messageRecords)
      messagesSynced += newMessages

      if (config.verbose) {
        const customer = chat.users.find(u => u.type === 'customer')
        console.log(
          `${progress} ✓ ${chat.id} - ${customer?.name || 'Unknown'} (${newMessages} new messages)`
        )
      } else {
        process.stdout.write(`\r${progress} Processing...`)
      }
    } catch (error) {
      errors++
      console.error(`\n${progress} ✗ ${chat.id}: ${(error as Error).message}`)
    }
  }

  console.log('\n')
  console.log('='.repeat(60))
  console.log('Sync Complete')
  console.log('='.repeat(60))
  console.log(`Conversations synced: ${conversationsSynced}`)
  console.log(`Messages synced: ${messagesSynced}`)
  console.log(`Errors: ${errors}`)
}

// =============================================================================
// Entry Point
// =============================================================================

const config = parseArgs()

syncLiveChat(config)
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\nFatal error:', error.message)
    if (config.verbose) {
      console.error(error.stack)
    }
    process.exit(1)
  })
