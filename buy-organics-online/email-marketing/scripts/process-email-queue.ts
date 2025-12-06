/**
 * BOO Email Queue Processor
 *
 * Processes pending emails from the automation queue and sends them via Listmonk.
 * Run this on a schedule (e.g., every 5 minutes via cron).
 *
 * Usage:
 *   npx tsx buy-organics-online/email-marketing/scripts/process-email-queue.ts
 *   npx tsx buy-organics-online/email-marketing/scripts/process-email-queue.ts --dry-run
 *   npx tsx buy-organics-online/email-marketing/scripts/process-email-queue.ts --limit 10
 */

import { createClient } from '@supabase/supabase-js';
import { createListmonkClient } from '../../../shared/libs/integrations/listmonk/client';

// Configuration
const BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE || '50', 10);
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = parseInt(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || String(BATCH_SIZE), 10);

// Template ID mapping (to be configured after Listmonk setup)
const TEMPLATE_IDS: Record<string, number> = {
  welcome_1: 1,
  welcome_2: 2,
  welcome_3: 3,
  cart_1: 4,
  cart_2: 5,
  cart_3: 6,
  winback_1: 7,
  winback_2: 8,
  review_1: 9,
  birthday_1: 10,
  post_purchase_1: 11,
};

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const listmonk = createListmonkClient();

interface PendingEmail {
  queue_id: string;
  email: string;
  automation_type: string;
  sequence_number: number;
  template_name: string;
  subject: string;
  context: Record<string, any>;
  subscriber_first_name: string | null;
}

async function getPendingEmails(): Promise<PendingEmail[]> {
  const { data, error } = await supabase.rpc('boo_get_pending_emails', {
    p_limit: LIMIT,
  });

  if (error) {
    throw new Error(`Failed to get pending emails: ${error.message}`);
  }

  return data || [];
}

async function sendEmail(email: PendingEmail): Promise<boolean> {
  const templateId = TEMPLATE_IDS[email.template_name];

  if (!templateId) {
    console.error(`Unknown template: ${email.template_name}`);
    await markEmailFailed(email.queue_id, `Unknown template: ${email.template_name}`);
    return false;
  }

  // Build template data
  const templateData: Record<string, any> = {
    first_name: email.subscriber_first_name || 'there',
    email: email.email,
    subject: email.subject,
    ...email.context,
  };

  // Process cart contents if present
  if (email.context.cart_contents) {
    templateData.cart_items = email.context.cart_contents;
    templateData.cart_value = email.context.cart_value;
    templateData.cart_url = email.context.cart_url;
  }

  // Process discount code if present
  if (email.context.discount_code) {
    templateData.discount_code = email.context.discount_code;
    templateData.discount_percent = email.context.discount_percent;
    templateData.discount_expiry = email.context.discount_expiry;
  }

  try {
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would send ${email.template_name} to ${email.email}`);
      console.log(`  Subject: ${email.subject}`);
      console.log(`  Template ID: ${templateId}`);
      console.log(`  Data:`, JSON.stringify(templateData, null, 2));
      return true;
    }

    // Send via Listmonk transactional API
    await listmonk.sendTransactionalToEmail(
      email.email,
      templateId,
      templateData
    );

    // Mark as sent in database
    await markEmailSent(email.queue_id);

    console.log(`Sent ${email.automation_type} email #${email.sequence_number} to ${email.email}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to send email to ${email.email}: ${errorMessage}`);
    await markEmailFailed(email.queue_id, errorMessage);
    return false;
  }
}

async function markEmailSent(queueId: string): Promise<void> {
  const { error } = await supabase.rpc('boo_mark_email_sent', {
    p_queue_id: queueId,
    p_listmonk_campaign_id: null,
  });

  if (error) {
    console.error(`Failed to mark email as sent: ${error.message}`);
  }
}

async function markEmailFailed(queueId: string, errorMessage: string): Promise<void> {
  const { error } = await supabase.rpc('boo_mark_email_failed', {
    p_queue_id: queueId,
    p_error_message: errorMessage,
  });

  if (error) {
    console.error(`Failed to mark email as failed: ${error.message}`);
  }
}

async function queueNextSequenceEmail(email: PendingEmail): Promise<void> {
  // Check if there's a next step in the sequence
  const { data: config } = await supabase
    .from('boo_email_automation_config')
    .select('config')
    .eq('automation_type', email.automation_type)
    .single();

  if (!config?.config?.sequence) return;

  const sequence = config.config.sequence;
  const nextIndex = email.sequence_number; // Current is 1-indexed, array is 0-indexed

  if (nextIndex < sequence.length) {
    const nextStep = sequence[nextIndex];
    const delayHours = nextStep.delay_hours || (nextStep.delay_days ? nextStep.delay_days * 24 : 0);

    // Queue the next email
    await supabase.rpc('boo_queue_automation_email', {
      p_email: email.email,
      p_automation_type: email.automation_type,
      p_sequence_number: email.sequence_number + 1,
      p_delay_hours: delayHours,
      p_context: email.context,
    });

    console.log(`Queued next email in ${email.automation_type} sequence for ${email.email}`);
  }
}

async function processQueue(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`BOO Email Queue Processor`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Batch size: ${LIMIT}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Get pending emails
    const pendingEmails = await getPendingEmails();

    if (pendingEmails.length === 0) {
      console.log('No pending emails to process.');
      return;
    }

    console.log(`Found ${pendingEmails.length} pending emails.\n`);

    let sent = 0;
    let failed = 0;

    for (const email of pendingEmails) {
      const success = await sendEmail(email);

      if (success) {
        sent++;
        // Queue next email in sequence if applicable
        if (!DRY_RUN) {
          await queueNextSequenceEmail(email);
        }
      } else {
        failed++;
      }

      // Small delay between emails to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Summary:`);
    console.log(`  Total processed: ${pendingEmails.length}`);
    console.log(`  Sent: ${sent}`);
    console.log(`  Failed: ${failed}`);
    console.log(`Completed: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);
  } catch (error) {
    console.error('Queue processing failed:', error);
    process.exit(1);
  }
}

// Expire old discount codes
async function expireDiscountCodes(): Promise<void> {
  const { data, error } = await supabase.rpc('boo_expire_discount_codes');

  if (error) {
    console.error('Failed to expire discount codes:', error.message);
  } else if (data > 0) {
    console.log(`Expired ${data} discount codes.`);
  }
}

// Main execution
async function main(): Promise<void> {
  // Expire old discount codes first
  await expireDiscountCodes();

  // Process email queue
  await processQueue();
}

main().catch(console.error);
