#!/usr/bin/env npx tsx

/**
 * Bounce Manager Script
 *
 * Manages email bounces across all campaigns:
 * - Processes bounce webhooks
 * - Updates suppression lists
 * - Generates bounce reports
 * - Alerts on high bounce rates
 *
 * Usage:
 *   npx tsx bounce-manager.ts process-webhooks
 *   npx tsx bounce-manager.ts report [days]
 *   npx tsx bounce-manager.ts clean-list <campaign-id>
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.BOO_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

// Bounce categories
type BounceType = 'hard' | 'soft' | 'complaint' | 'unsubscribe';

interface BounceRecord {
  email: string;
  bounceType: BounceType;
  reason: string;
  source: string;
  occurredAt: Date;
}

interface SuppressionEntry {
  email: string;
  reason: BounceType;
  source: string;
  suppressedAt: Date;
  expiresAt?: Date;
}

// Suppression list table schema (to be created if not exists)
const SUPPRESSION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS email_suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  email_hash TEXT GENERATED ALWAYS AS (md5(lower(email))) STORED,
  reason TEXT NOT NULL,
  source TEXT NOT NULL,
  source_campaign_id TEXT,
  bounce_details JSONB,
  suppressed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email_hash)
);

CREATE INDEX IF NOT EXISTS idx_suppression_email_hash ON email_suppression_list(email_hash);
CREATE INDEX IF NOT EXISTS idx_suppression_expires ON email_suppression_list(expires_at) WHERE expires_at IS NOT NULL;
`;

/**
 * Ensure suppression table exists
 */
async function ensureSuppressionTable() {
  // Check if table exists
  const { data } = await supabase
    .from('email_suppression_list')
    .select('id')
    .limit(1);

  if (data === null) {
    console.log('Suppression table does not exist. Please create it manually in Supabase.');
    console.log('\nSQL to run:');
    console.log(SUPPRESSION_TABLE_SQL);
    return false;
  }
  return true;
}

/**
 * Add email to suppression list
 */
async function addToSuppressionList(entry: SuppressionEntry): Promise<void> {
  const isPermanent = entry.reason === 'hard' ||
                      entry.reason === 'complaint' ||
                      entry.reason === 'unsubscribe';

  const expiresAt = isPermanent ? null :
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for soft bounces

  await supabase.from('email_suppression_list').upsert({
    email: entry.email.toLowerCase(),
    reason: entry.reason,
    source: entry.source,
    suppressed_at: entry.suppressedAt.toISOString(),
    expires_at: expiresAt?.toISOString(),
    is_permanent: isPermanent
  }, {
    onConflict: 'email_hash',
    ignoreDuplicates: false
  });
}

/**
 * Check if email is suppressed
 */
async function isEmailSuppressed(email: string): Promise<{ suppressed: boolean; reason?: string }> {
  const { data } = await supabase
    .from('email_suppression_list')
    .select('reason, expires_at, is_permanent')
    .eq('email', email.toLowerCase())
    .single();

  if (!data) {
    return { suppressed: false };
  }

  // Check if temporary suppression has expired
  if (!data.is_permanent && data.expires_at) {
    if (new Date(data.expires_at) < new Date()) {
      // Expired, remove from list
      await supabase
        .from('email_suppression_list')
        .delete()
        .eq('email', email.toLowerCase());
      return { suppressed: false };
    }
  }

  return { suppressed: true, reason: data.reason };
}

/**
 * Process Smartlead bounces
 */
async function processSmartleadBounces(): Promise<number> {
  console.log('Processing Smartlead bounces...');

  const { data: bounces } = await supabase
    .from('smartlead_emails')
    .select(`
      lead_id,
      campaign_id,
      bounced_at,
      bounce_reason,
      smartlead_leads!inner(email)
    `)
    .not('bounced_at', 'is', null);

  if (!bounces || bounces.length === 0) {
    console.log('No bounces found');
    return 0;
  }

  let processed = 0;
  for (const bounce of bounces) {
    const email = (bounce as any).smartlead_leads?.email;
    if (!email) continue;

    // Determine bounce type
    const reason = bounce.bounce_reason?.toLowerCase() || '';
    let bounceType: BounceType = 'soft';

    if (reason.includes('invalid') || reason.includes('not exist') ||
        reason.includes('unknown user') || reason.includes('rejected')) {
      bounceType = 'hard';
    }

    await addToSuppressionList({
      email,
      reason: bounceType,
      source: `smartlead:${bounce.campaign_id}`,
      suppressedAt: new Date(bounce.bounced_at)
    });
    processed++;
  }

  console.log(`Processed ${processed} Smartlead bounces`);
  return processed;
}

/**
 * Process anniversary email failures
 */
async function processAnniversaryFailures(): Promise<number> {
  console.log('Processing Anniversary email failures...');

  const { data: failures } = await supabase
    .from('tlx_anniversary_discounts')
    .select('email, error_message, created_at')
    .eq('status', 'failed');

  if (!failures || failures.length === 0) {
    console.log('No failures found');
    return 0;
  }

  let processed = 0;
  for (const failure of failures) {
    // Determine if it's a bounce or other failure
    const error = failure.error_message?.toLowerCase() || '';

    if (error.includes('bounce') || error.includes('invalid') ||
        error.includes('not exist') || error.includes('rejected')) {
      await addToSuppressionList({
        email: failure.email,
        reason: 'hard',
        source: 'anniversary',
        suppressedAt: new Date(failure.created_at)
      });
      processed++;
    }
  }

  console.log(`Processed ${processed} Anniversary failures`);
  return processed;
}

/**
 * Process winback email failures
 */
async function processWinbackFailures(): Promise<number> {
  console.log('Processing Winback email failures...');

  const { data: failures } = await supabase
    .from('tlx_winback_emails')
    .select('email, error_message, created_at')
    .in('status', ['bounced', 'failed']);

  if (!failures || failures.length === 0) {
    console.log('No failures found');
    return 0;
  }

  let processed = 0;
  for (const failure of failures) {
    await addToSuppressionList({
      email: failure.email,
      reason: 'hard',
      source: 'winback',
      suppressedAt: new Date(failure.created_at)
    });
    processed++;
  }

  console.log(`Processed ${processed} Winback failures`);
  return processed;
}

/**
 * Generate bounce report
 */
async function generateBounceReport(days: number): Promise<void> {
  console.log(`\nBOUNCE REPORT - Last ${days} days`);
  console.log('='.repeat(60));

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Smartlead bounces
  const { data: smartleadBounces, count: smartleadCount } = await supabase
    .from('smartlead_emails')
    .select('campaign_id, bounce_reason', { count: 'exact' })
    .not('bounced_at', 'is', null)
    .gte('bounced_at', startDate.toISOString());

  // Total Smartlead sent
  const { count: smartleadSent } = await supabase
    .from('smartlead_emails')
    .select('*', { count: 'exact', head: true })
    .not('sent_at', 'is', null)
    .gte('sent_at', startDate.toISOString());

  console.log('\n--- SMARTLEAD ---');
  console.log(`Total Sent: ${smartleadSent || 0}`);
  console.log(`Total Bounced: ${smartleadCount || 0}`);
  console.log(`Bounce Rate: ${smartleadSent ? ((smartleadCount || 0) / smartleadSent * 100).toFixed(2) : 0}%`);

  // Bounce reasons breakdown
  if (smartleadBounces && smartleadBounces.length > 0) {
    const reasons: Record<string, number> = {};
    for (const b of smartleadBounces) {
      const reason = b.bounce_reason || 'unknown';
      reasons[reason] = (reasons[reason] || 0) + 1;
    }
    console.log('\nBounce Reasons:');
    Object.entries(reasons)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([reason, count]) => {
        console.log(`  ${reason}: ${count}`);
      });
  }

  // Anniversary failures
  const { count: anniversaryFailed } = await supabase
    .from('tlx_anniversary_discounts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed')
    .gte('created_at', startDate.toISOString());

  const { count: anniversarySent } = await supabase
    .from('tlx_anniversary_discounts')
    .select('*', { count: 'exact', head: true })
    .in('status', ['sent', 'used', 'expired', 'failed'])
    .gte('created_at', startDate.toISOString());

  console.log('\n--- ANNIVERSARY ---');
  console.log(`Total Sent: ${anniversarySent || 0}`);
  console.log(`Failed: ${anniversaryFailed || 0}`);
  console.log(`Failure Rate: ${anniversarySent ? ((anniversaryFailed || 0) / anniversarySent * 100).toFixed(2) : 0}%`);

  // Winback failures
  const { count: winbackFailed } = await supabase
    .from('tlx_winback_emails')
    .select('*', { count: 'exact', head: true })
    .in('status', ['bounced', 'failed'])
    .gte('created_at', startDate.toISOString());

  const { count: winbackSent } = await supabase
    .from('tlx_winback_emails')
    .select('*', { count: 'exact', head: true })
    .in('status', ['sent', 'clicked', 'converted', 'bounced', 'failed'])
    .gte('created_at', startDate.toISOString());

  console.log('\n--- WINBACK ---');
  console.log(`Total Sent: ${winbackSent || 0}`);
  console.log(`Failed/Bounced: ${winbackFailed || 0}`);
  console.log(`Failure Rate: ${winbackSent ? ((winbackFailed || 0) / winbackSent * 100).toFixed(2) : 0}%`);

  // Suppression list stats
  const { count: totalSuppressed } = await supabase
    .from('email_suppression_list')
    .select('*', { count: 'exact', head: true });

  const { count: permanentSuppressed } = await supabase
    .from('email_suppression_list')
    .select('*', { count: 'exact', head: true })
    .eq('is_permanent', true);

  console.log('\n--- SUPPRESSION LIST ---');
  console.log(`Total Suppressed: ${totalSuppressed || 0}`);
  console.log(`Permanent: ${permanentSuppressed || 0}`);
  console.log(`Temporary: ${(totalSuppressed || 0) - (permanentSuppressed || 0)}`);

  // Alerts
  console.log('\n--- ALERTS ---');
  const overallBounceRate = (smartleadSent || 0) > 0
    ? (smartleadCount || 0) / (smartleadSent || 1) * 100
    : 0;

  if (overallBounceRate > 5) {
    console.log('HIGH BOUNCE RATE: Overall bounce rate is above 5% - review list quality');
  }
  if (overallBounceRate > 3) {
    console.log('WARNING: Bounce rate above 3% - monitor closely');
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Clean suppressed emails from a campaign
 */
async function cleanCampaignList(campaignId: string): Promise<void> {
  console.log(`Cleaning campaign: ${campaignId}`);

  // Get all leads in campaign
  const { data: leads } = await supabase
    .from('smartlead_leads')
    .select('id, email')
    .eq('campaign_id', campaignId)
    .eq('status', 'active');

  if (!leads || leads.length === 0) {
    console.log('No active leads found');
    return;
  }

  console.log(`Found ${leads.length} active leads`);

  // Check each against suppression list
  let suppressed = 0;
  for (const lead of leads) {
    const check = await isEmailSuppressed(lead.email);
    if (check.suppressed) {
      // Update lead status
      await supabase
        .from('smartlead_leads')
        .update({ status: 'suppressed' })
        .eq('id', lead.id);
      suppressed++;
    }
  }

  console.log(`Suppressed ${suppressed} leads from campaign`);
}

/**
 * Clean expired suppressions
 */
async function cleanExpiredSuppressions(): Promise<number> {
  const { data, error } = await supabase
    .from('email_suppression_list')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .eq('is_permanent', false)
    .select();

  if (error) {
    console.error('Error cleaning expired suppressions:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Main entry point
 */
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  // Check suppression table exists
  const tableExists = await ensureSuppressionTable();
  if (!tableExists && command !== 'report') {
    process.exit(1);
  }

  switch (command) {
    case 'process-webhooks':
    case 'process':
      console.log('Processing all bounce sources...\n');
      const smartlead = await processSmartleadBounces();
      const anniversary = await processAnniversaryFailures();
      const winback = await processWinbackFailures();
      const expired = await cleanExpiredSuppressions();
      console.log(`\nTotal processed: ${smartlead + anniversary + winback}`);
      console.log(`Expired suppressions cleaned: ${expired}`);
      break;

    case 'report':
      const days = parseInt(arg) || 30;
      await generateBounceReport(days);
      break;

    case 'clean-list':
      if (!arg) {
        console.error('Usage: bounce-manager.ts clean-list <campaign-id>');
        process.exit(1);
      }
      await cleanCampaignList(arg);
      break;

    case 'check':
      if (!arg) {
        console.error('Usage: bounce-manager.ts check <email>');
        process.exit(1);
      }
      const result = await isEmailSuppressed(arg);
      console.log(`Email: ${arg}`);
      console.log(`Suppressed: ${result.suppressed}`);
      if (result.reason) {
        console.log(`Reason: ${result.reason}`);
      }
      break;

    default:
      console.log('Bounce Manager');
      console.log('');
      console.log('Commands:');
      console.log('  process-webhooks    Process all bounce sources');
      console.log('  report [days]       Generate bounce report (default: 30 days)');
      console.log('  clean-list <id>     Clean suppressed emails from campaign');
      console.log('  check <email>       Check if email is suppressed');
  }
}

main().catch(console.error);
