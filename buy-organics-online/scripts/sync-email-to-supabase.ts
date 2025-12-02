#!/usr/bin/env npx tsx
/**
 * Email to Supabase Sync Script
 *
 * Pulls emails from sales@buyorganicsonline.com.au and stores in Supabase
 * for analysis and customer intelligence.
 *
 * Supports both:
 * - Gmail/Google Workspace (via Gmail API)
 * - Standard IMAP (any email provider)
 *
 * Usage:
 *   npx tsx sync-email-to-supabase.ts
 *   npx tsx sync-email-to-supabase.ts --days 30
 *   npx tsx sync-email-to-supabase.ts --full  # Full 12-month sync
 *
 * Required Environment Variables:
 *   BOO_SALES_EMAIL_TYPE - 'gmail' or 'imap'
 *   + Gmail: BOO_SALES_GMAIL_CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN
 *   + IMAP: BOO_SALES_IMAP_HOST, PORT, USER, PASS
 *   BOO_SUPABASE_URL - Supabase project URL
 *   BOO_SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: 'buy-organics-online/BOO-CREDENTIALS.env' });
dotenv.config({ path: 'MASTER-CREDENTIALS-COMPLETE.env' });

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  email: {
    type: process.env.BOO_SALES_EMAIL_TYPE || 'imap',
    address: process.env.BOO_SALES_EMAIL || 'sales@buyorganicsonline.com.au',
    // Gmail settings
    gmail: {
      clientId: process.env.BOO_SALES_GMAIL_CLIENT_ID || '',
      clientSecret: process.env.BOO_SALES_GMAIL_CLIENT_SECRET || '',
      refreshToken: process.env.BOO_SALES_GMAIL_REFRESH_TOKEN || '',
    },
    // IMAP settings
    imap: {
      host: process.env.BOO_SALES_IMAP_HOST || '',
      port: parseInt(process.env.BOO_SALES_IMAP_PORT || '993'),
      user: process.env.BOO_SALES_IMAP_USER || '',
      password: process.env.BOO_SALES_IMAP_PASS || '',
      tls: process.env.BOO_SALES_IMAP_TLS !== 'false',
    },
  },
  supabase: {
    url: process.env.BOO_SUPABASE_URL || process.env.SUPABASE_URL || '',
    serviceKey: process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  sync: {
    defaultDays: 365,
    batchSize: 50,
    folders: ['INBOX'],  // Folders to sync
  }
};

// ============================================================================
// TYPES
// ============================================================================

interface EmailMessage {
  messageId: string;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  date: Date;
  text?: string;
  html?: string;
  attachments?: any[];
}

interface CustomerInteraction {
  source: string;
  external_id: string;
  customer_email?: string;
  customer_name?: string;
  subject?: string;
  transcript?: string;
  message_count: number;
  status: string;
  started_at: string;
  last_message_at?: string;
  raw_data: any;
}

// ============================================================================
// IMAP EMAIL CLIENT
// ============================================================================

class ImapClient {
  private config: typeof CONFIG.email.imap;

  constructor(config: typeof CONFIG.email.imap) {
    this.config = config;
  }

  async fetchEmails(options: {
    since?: Date;
    folder?: string;
    limit?: number;
  } = {}): Promise<EmailMessage[]> {
    const { since, folder = 'INBOX', limit = 100 } = options;

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.config.user,
        password: this.config.password,
        host: this.config.host,
        port: this.config.port,
        tls: this.config.tls,
        tlsOptions: { rejectUnauthorized: false },
      });

      const emails: EmailMessage[] = [];

      imap.once('ready', () => {
        imap.openBox(folder, true, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          // Build search criteria
          const searchCriteria: any[] = ['ALL'];
          if (since) {
            searchCriteria.push(['SINCE', since]);
          }

          imap.search(searchCriteria, (err, results) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            if (!results || results.length === 0) {
              imap.end();
              return resolve([]);
            }

            // Limit results
            const messagesToFetch = results.slice(-limit);

            const fetch = imap.fetch(messagesToFetch, {
              bodies: '',
              struct: true,
            });

            fetch.on('message', (msg) => {
              let buffer = '';

              msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });
              });

              msg.once('end', async () => {
                try {
                  const parsed = await simpleParser(buffer);
                  emails.push(this.parseMail(parsed));
                } catch (parseErr) {
                  console.error('Error parsing email:', parseErr);
                }
              });
            });

            fetch.once('error', (err) => {
              console.error('Fetch error:', err);
            });

            fetch.once('end', () => {
              imap.end();
              resolve(emails);
            });
          });
        });
      });

      imap.once('error', (err: Error) => {
        reject(err);
      });

      imap.connect();
    });
  }

  private parseMail(mail: ParsedMail): EmailMessage {
    const from = mail.from?.value?.[0];

    return {
      messageId: mail.messageId || `${Date.now()}-${Math.random()}`,
      from: from?.address || '',
      fromName: from?.name,
      to: Array.isArray(mail.to)
        ? mail.to.map(t => t.value?.[0]?.address).join(', ')
        : mail.to?.value?.[0]?.address || '',
      subject: mail.subject || '(No Subject)',
      date: mail.date || new Date(),
      text: mail.text,
      html: mail.html || undefined,
      attachments: mail.attachments?.map(a => ({
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
      })),
    };
  }
}

// ============================================================================
// SYNC LOGIC
// ============================================================================

class EmailSync {
  private emailClient: ImapClient;
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.emailClient = new ImapClient(CONFIG.email.imap);
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async syncEmails(options: { days?: number; full?: boolean } = {}): Promise<{
    synced: number;
    errors: number;
    skipped: number;
  }> {
    const days = options.full ? 365 : (options.days || CONFIG.sync.defaultDays);
    const since = new Date();
    since.setDate(since.getDate() - days);

    console.log(`\n📧 Starting Email sync...`);
    console.log(`   Email: ${CONFIG.email.address}`);
    console.log(`   Period: Last ${days} days (from ${since.toISOString().split('T')[0]})`);
    console.log(`   Type: ${CONFIG.email.type.toUpperCase()}\n`);

    let synced = 0;
    let errors = 0;
    let skipped = 0;

    try {
      // Fetch emails
      console.log('   Fetching emails from server...');
      const emails = await this.emailClient.fetchEmails({
        since,
        limit: 1000,
      });
      console.log(`   Found ${emails.length} emails\n`);

      // Process each email
      for (const email of emails) {
        try {
          // Check if already synced
          const { data: existing } = await this.supabase
            .from('customer_interactions')
            .select('id')
            .eq('external_id', email.messageId)
            .single();

          if (existing) {
            skipped++;
            continue;
          }

          // Transform and insert
          const interaction = this.transformEmail(email);
          const { error } = await this.supabase
            .from('customer_interactions')
            .insert(interaction);

          if (error) {
            console.error(`   ❌ Error inserting email:`, error.message);
            errors++;
          } else {
            synced++;
            if (synced % 10 === 0) {
              console.log(`   ✓ Synced ${synced} emails...`);
            }
          }
        } catch (err: any) {
          console.error(`   ❌ Error processing email:`, err.message);
          errors++;
        }
      }

      // Update sync state
      await this.updateSyncState(synced, errors);

    } catch (err: any) {
      console.error(`\n❌ Sync failed:`, err.message);
      throw err;
    }

    console.log(`\n✅ Email sync complete!`);
    console.log(`   Synced: ${synced}`);
    console.log(`   Skipped (already exists): ${skipped}`);
    console.log(`   Errors: ${errors}`);

    return { synced, errors, skipped };
  }

  private transformEmail(email: EmailMessage): CustomerInteraction {
    // Use plain text or strip HTML
    const content = email.text || this.stripHtml(email.html || '');

    // Extract order IDs from subject/content
    const orderPattern = /[A-Z]?\d{9,}/g;
    const orderIds = [
      ...(email.subject?.match(orderPattern) || []),
      ...(content.match(orderPattern) || []),
    ].filter((v, i, a) => a.indexOf(v) === i);  // Unique

    return {
      source: 'email',
      external_id: email.messageId,
      customer_email: email.from,
      customer_name: email.fromName,
      subject: email.subject,
      transcript: content.substring(0, 50000),  // Limit transcript size
      message_count: 1,
      status: 'open',  // All incoming emails start as open
      started_at: email.date.toISOString(),
      last_message_at: email.date.toISOString(),
      raw_data: {
        to: email.to,
        hasAttachments: (email.attachments?.length || 0) > 0,
        attachmentCount: email.attachments?.length || 0,
        orderIds,
      },
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async updateSyncState(synced: number, errors: number): Promise<void> {
    await this.supabase
      .from('email_sync_state')
      .upsert({
        email_address: CONFIG.email.address,
        last_sync_at: new Date().toISOString(),
        sync_status: errors > 0 ? 'completed_with_errors' : 'completed',
        error_message: errors > 0 ? `${errors} errors during sync` : null,
      }, { onConflict: 'email_address' });
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═'.repeat(60));
  console.log('Email → Supabase Sync');
  console.log('═'.repeat(60));

  // Validate configuration
  if (CONFIG.email.type === 'imap') {
    if (!CONFIG.email.imap.host || !CONFIG.email.imap.user || !CONFIG.email.imap.password) {
      console.error('\n❌ Missing IMAP credentials!');
      console.error('   Set BOO_SALES_IMAP_HOST, BOO_SALES_IMAP_USER, BOO_SALES_IMAP_PASS');
      console.error('\n   Example for common providers:');
      console.error('   Gmail: imap.gmail.com:993');
      console.error('   Outlook: outlook.office365.com:993');
      console.error('   cPanel: mail.buyorganicsonline.com.au:993');
      process.exit(1);
    }
  } else if (CONFIG.email.type === 'gmail') {
    if (!CONFIG.email.gmail.clientId || !CONFIG.email.gmail.refreshToken) {
      console.error('\n❌ Missing Gmail API credentials!');
      console.error('   Set BOO_SALES_GMAIL_CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN');
      console.error('\n   To set up Gmail API:');
      console.error('   1. Create project at console.cloud.google.com');
      console.error('   2. Enable Gmail API');
      console.error('   3. Create OAuth credentials');
      console.error('   4. Get refresh token via OAuth flow');
      process.exit(1);
    }
  }

  if (!CONFIG.supabase.url || !CONFIG.supabase.serviceKey) {
    console.error('\n❌ Missing Supabase credentials!');
    console.error('   Set BOO_SUPABASE_URL and BOO_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Parse arguments
  const args = process.argv.slice(2);
  const fullSync = args.includes('--full');
  const daysArg = args.find(a => a.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1]) : undefined;

  // Run sync
  const sync = new EmailSync(
    CONFIG.supabase.url,
    CONFIG.supabase.serviceKey
  );

  try {
    const result = await sync.syncEmails({ days, full: fullSync });
    process.exit(result.errors > 0 ? 1 : 0);
  } catch (err) {
    process.exit(1);
  }
}

main();
