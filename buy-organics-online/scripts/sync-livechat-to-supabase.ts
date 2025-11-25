#!/usr/bin/env npx tsx
/**
 * LiveChat to Supabase Sync Script
 *
 * Pulls chat history from LiveChat API and stores in Supabase
 * for analysis and customer intelligence.
 *
 * Usage:
 *   npx tsx sync-livechat-to-supabase.ts
 *   npx tsx sync-livechat-to-supabase.ts --days 30
 *   npx tsx sync-livechat-to-supabase.ts --full  # Full 12-month sync
 *
 * Required Environment Variables:
 *   BOO_LIVECHAT_PAT - Personal Access Token (base64 encoded with account:token)
 *   BOO_SUPABASE_URL - Supabase project URL
 *   BOO_SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: 'buy-organics-online/BOO-CREDENTIALS.env' });
dotenv.config({ path: 'MASTER-CREDENTIALS-COMPLETE.env' });

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  livechat: {
    accountId: process.env.BOO_LIVECHAT_ACCOUNT_ID || '',
    pat: process.env.BOO_LIVECHAT_PAT || '',
    patBase64: process.env.BOO_LIVECHAT_PAT_BASE64 || '',
    apiUrl: 'https://api.livechatinc.com/v3.5',
  },
  supabase: {
    url: process.env.BOO_SUPABASE_URL || process.env.SUPABASE_URL || '',
    serviceKey: process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  sync: {
    defaultDays: 365, // 12 months by default
    batchSize: 100,
    rateLimitDelay: 200, // ms between API calls
  }
};

// ============================================================================
// TYPES
// ============================================================================

interface LiveChatThread {
  id: string;
  created_at: string;
  thread_summary?: string;
  properties?: Record<string, any>;
  access?: {
    group_ids?: number[];
  };
}

interface LiveChatChat {
  id: string;
  thread: LiveChatThread;
  users: LiveChatUser[];
  properties?: Record<string, any>;
}

interface LiveChatUser {
  id: string;
  type: 'customer' | 'agent';
  name?: string;
  email?: string;
  avatar?: string;
  present?: boolean;
  geolocation?: {
    city?: string;
    region?: string;
    country?: string;
  };
}

interface LiveChatEvent {
  id: string;
  type: string;
  author_id: string;
  text?: string;
  created_at: string;
  properties?: Record<string, any>;
}

interface CustomerInteraction {
  source: string;
  external_id: string;
  customer_email?: string;
  customer_name?: string;
  customer_location?: string;
  subject?: string;
  transcript?: string;
  message_count: number;
  category?: string;
  status: string;
  agent_name?: string;
  agent_email?: string;
  started_at: string;
  ended_at?: string;
  last_message_at?: string;
  raw_data: any;
}

// ============================================================================
// LIVECHAT API CLIENT
// ============================================================================

class LiveChatClient {
  private authHeader: string;

  constructor(patBase64: string) {
    this.authHeader = `Basic ${patBase64}`;
  }

  async listChats(options: {
    fromDate?: Date;
    toDate?: Date;
    pageId?: string;
    limit?: number;
  } = {}): Promise<{ chats: LiveChatChat[]; nextPageId?: string; total?: number }> {
    const { fromDate, toDate, pageId, limit = 100 } = options;

    const filters: any = {};
    if (fromDate) {
      filters.from = fromDate.toISOString();
    }
    if (toDate) {
      filters.to = toDate.toISOString();
    }

    const body: any = {
      limit,
      sort_order: 'desc',
    };

    if (Object.keys(filters).length > 0) {
      body.filters = filters;
    }

    if (pageId) {
      body.page_id = pageId;
    }

    const response = await fetch(`${CONFIG.livechat.apiUrl}/agent/action/list_archives`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LiveChat API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      chats: data.chats || [],
      nextPageId: data.next_page_id,
      total: data.total,
    };
  }

  async getChatThread(chatId: string, threadId: string): Promise<any> {
    const response = await fetch(`${CONFIG.livechat.apiUrl}/agent/action/get_chat`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        thread_id: threadId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LiveChat API error: ${response.status} - ${error}`);
    }

    return response.json();
  }
}

// ============================================================================
// SYNC LOGIC
// ============================================================================

class LiveChatSync {
  private livechat: LiveChatClient;
  private supabase: SupabaseClient;

  constructor(livechatPat: string, supabaseUrl: string, supabaseKey: string) {
    this.livechat = new LiveChatClient(livechatPat);
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async syncChats(options: { days?: number; full?: boolean } = {}): Promise<{
    synced: number;
    errors: number;
    skipped: number;
  }> {
    const days = options.full ? 365 : (options.days || CONFIG.sync.defaultDays);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    console.log(`\n📥 Starting LiveChat sync...`);
    console.log(`   Period: Last ${days} days (from ${fromDate.toISOString().split('T')[0]})`);

    let synced = 0;
    let errors = 0;
    let skipped = 0;
    let pageId: string | undefined;
    let totalChats = 0;
    let processedChats = 0;

    try {
      // Get total count first
      const initial = await this.livechat.listChats({ fromDate, limit: 1 });
      totalChats = initial.total || 0;
      console.log(`   Total chats to process: ${totalChats}\n`);

      // Process in batches
      do {
        const result = await this.livechat.listChats({
          fromDate,
          pageId,
          limit: CONFIG.sync.batchSize,
        });

        for (const chat of result.chats) {
          processedChats++;

          try {
            // Check if already synced
            const { data: existing } = await this.supabase
              .from('customer_interactions')
              .select('id')
              .eq('external_id', chat.id)
              .single();

            if (existing) {
              skipped++;
              continue;
            }

            // Transform and insert
            const interaction = this.transformChat(chat);
            const { error } = await this.supabase
              .from('customer_interactions')
              .insert(interaction);

            if (error) {
              console.error(`   ❌ Error inserting chat ${chat.id}:`, error.message);
              errors++;
            } else {
              synced++;
              if (synced % 10 === 0) {
                console.log(`   ✓ Synced ${synced} chats (${processedChats}/${totalChats})...`);
              }
            }
          } catch (err: any) {
            console.error(`   ❌ Error processing chat ${chat.id}:`, err.message);
            errors++;
          }

          // Rate limiting
          await this.delay(CONFIG.sync.rateLimitDelay);
        }

        pageId = result.nextPageId;

      } while (pageId);

      // Update sync state
      await this.updateSyncState(synced, errors);

    } catch (err: any) {
      console.error(`\n❌ Sync failed:`, err.message);
      throw err;
    }

    console.log(`\n✅ Sync complete!`);
    console.log(`   Synced: ${synced}`);
    console.log(`   Skipped (already exists): ${skipped}`);
    console.log(`   Errors: ${errors}`);

    return { synced, errors, skipped };
  }

  private transformChat(chat: LiveChatChat): CustomerInteraction {
    // Find customer and agent
    const customer = chat.users?.find(u => u.type === 'customer');
    const agent = chat.users?.find(u => u.type === 'agent');

    // Build location string
    let location: string | undefined;
    if (customer?.geolocation) {
      const { city, region, country } = customer.geolocation;
      location = [city, region, country].filter(Boolean).join(', ');
    }

    // Extract transcript from thread summary or events
    const transcript = chat.thread?.thread_summary || '';

    // Determine status
    const status = chat.thread?.properties?.routing?.continuous ? 'open' : 'resolved';

    return {
      source: 'livechat',
      external_id: chat.id,
      customer_email: customer?.email,
      customer_name: customer?.name,
      customer_location: location,
      subject: this.extractSubject(transcript),
      transcript,
      message_count: this.countMessages(chat),
      status,
      agent_name: agent?.name,
      agent_email: agent?.email,
      started_at: chat.thread?.created_at || new Date().toISOString(),
      raw_data: chat,
    };
  }

  private extractSubject(transcript: string): string {
    if (!transcript) return 'Chat conversation';
    // Get first 100 chars as subject
    const firstLine = transcript.split('\n')[0] || '';
    return firstLine.length > 100 ? firstLine.substring(0, 97) + '...' : firstLine;
  }

  private countMessages(chat: LiveChatChat): number {
    // Count from events if available, otherwise estimate
    return chat.thread?.properties?.events_count || 0;
  }

  private async updateSyncState(synced: number, errors: number): Promise<void> {
    const accountId = CONFIG.livechat.accountId;
    if (!accountId) return;

    await this.supabase
      .from('livechat_sync_state')
      .upsert({
        account_id: accountId,
        last_sync_at: new Date().toISOString(),
        total_threads_synced: synced,
        sync_status: errors > 0 ? 'completed_with_errors' : 'completed',
        error_message: errors > 0 ? `${errors} errors during sync` : null,
      }, { onConflict: 'account_id' });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═'.repeat(60));
  console.log('LiveChat → Supabase Sync');
  console.log('═'.repeat(60));

  // Validate configuration
  if (!CONFIG.livechat.patBase64 && !CONFIG.livechat.pat) {
    console.error('\n❌ Missing LiveChat credentials!');
    console.error('   Set BOO_LIVECHAT_PAT_BASE64 or BOO_LIVECHAT_PAT environment variable');
    console.error('\n   To create PAT:');
    console.error('   1. Go to https://developers.livechat.com/console/tools/personal-access-tokens');
    console.error('   2. Create token with scopes: chats--all:ro, agents--all:ro, customers--all:ro');
    console.error('   3. Base64 encode: echo -n "account_id:token" | base64');
    process.exit(1);
  }

  if (!CONFIG.supabase.url || !CONFIG.supabase.serviceKey) {
    console.error('\n❌ Missing Supabase credentials!');
    console.error('   Set BOO_SUPABASE_URL and BOO_SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  // Parse arguments
  const args = process.argv.slice(2);
  const fullSync = args.includes('--full');
  const daysArg = args.find(a => a.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1]) : undefined;

  // Use base64 PAT if available, otherwise encode the raw PAT
  let patBase64 = CONFIG.livechat.patBase64;
  if (!patBase64 && CONFIG.livechat.pat) {
    // Format: account_id:token
    const credentials = `${CONFIG.livechat.accountId}:${CONFIG.livechat.pat}`;
    patBase64 = Buffer.from(credentials).toString('base64');
  }

  // Run sync
  const sync = new LiveChatSync(
    patBase64,
    CONFIG.supabase.url,
    CONFIG.supabase.serviceKey
  );

  try {
    const result = await sync.syncChats({ days, full: fullSync });
    process.exit(result.errors > 0 ? 1 : 0);
  } catch (err) {
    process.exit(1);
  }
}

main();
