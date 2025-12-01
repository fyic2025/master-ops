/**
 * BOO Klaviyo to Listmonk Migration Script
 *
 * Exports subscribers from Klaviyo and imports them to Listmonk,
 * tracking the migration in Supabase.
 *
 * Usage:
 *   npx tsx buy-organics-online/email-marketing/scripts/migrate-klaviyo-subscribers.ts
 *   npx tsx buy-organics-online/email-marketing/scripts/migrate-klaviyo-subscribers.ts --dry-run
 *   npx tsx buy-organics-online/email-marketing/scripts/migrate-klaviyo-subscribers.ts --export-only
 *   npx tsx buy-organics-online/email-marketing/scripts/migrate-klaviyo-subscribers.ts --import-only
 */

import { createClient } from '@supabase/supabase-js';
import { createListmonkClient } from '../../../shared/libs/integrations/listmonk/client';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const EXPORT_ONLY = process.argv.includes('--export-only');
const IMPORT_ONLY = process.argv.includes('--import-only');
const BATCH_SIZE = 100;
const EXPORT_FILE = path.join(__dirname, '../data/klaviyo-export.json');

// Klaviyo API configuration
const KLAVIYO_API_KEY = process.env.BOO_KLAVIYO_API_KEY || '';
const KLAVIYO_API_URL = 'https://a.klaviyo.com/api';
const KLAVIYO_API_REVISION = '2024-10-15';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const listmonk = createListmonkClient();

interface KlaviyoProfile {
  id: string;
  type: string;
  attributes: {
    email: string;
    phone_number?: string;
    external_id?: string;
    first_name?: string;
    last_name?: string;
    organization?: string;
    title?: string;
    image?: string;
    created?: string;
    updated?: string;
    last_event_date?: string;
    location?: {
      address1?: string;
      address2?: string;
      city?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      region?: string;
      zip?: string;
      timezone?: string;
    };
    properties?: Record<string, any>;
  };
}

interface MigrationRecord {
  klaviyo_profile_id: string;
  email: string;
  migration_status: 'pending' | 'migrated' | 'failed' | 'skipped';
  listmonk_subscriber_id?: number;
  error_message?: string;
  source_data: any;
}

async function fetchKlaviyoProfiles(): Promise<KlaviyoProfile[]> {
  console.log('Fetching profiles from Klaviyo...');

  const profiles: KlaviyoProfile[] = [];
  let nextUrl: string | null = `${KLAVIYO_API_URL}/profiles/`;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        revision: KLAVIYO_API_REVISION,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Klaviyo API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    profiles.push(...data.data);

    // Get next page URL
    nextUrl = data.links?.next || null;

    console.log(`Fetched ${profiles.length} profiles...`);

    // Rate limiting - 1 request per 100ms
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`Total profiles fetched: ${profiles.length}`);
  return profiles;
}

async function exportProfiles(profiles: KlaviyoProfile[]): Promise<void> {
  // Ensure directory exists
  const dir = path.dirname(EXPORT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(EXPORT_FILE, JSON.stringify(profiles, null, 2));
  console.log(`Exported ${profiles.length} profiles to ${EXPORT_FILE}`);
}

function loadExportedProfiles(): KlaviyoProfile[] {
  if (!fs.existsSync(EXPORT_FILE)) {
    throw new Error(`Export file not found: ${EXPORT_FILE}. Run with --export-only first.`);
  }

  const data = fs.readFileSync(EXPORT_FILE, 'utf-8');
  return JSON.parse(data);
}

async function logMigration(record: MigrationRecord): Promise<void> {
  await supabase.from('boo_klaviyo_migration_log').upsert(
    {
      klaviyo_profile_id: record.klaviyo_profile_id,
      email: record.email,
      migration_status: record.migration_status,
      listmonk_subscriber_id: record.listmonk_subscriber_id,
      error_message: record.error_message,
      source_data: record.source_data,
      migrated_at: record.migration_status === 'migrated' ? new Date().toISOString() : null,
    },
    { onConflict: 'klaviyo_profile_id' }
  );
}

async function getMigratedProfiles(): Promise<Set<string>> {
  const { data } = await supabase
    .from('boo_klaviyo_migration_log')
    .select('klaviyo_profile_id')
    .eq('migration_status', 'migrated');

  return new Set((data || []).map((r) => r.klaviyo_profile_id));
}

async function importToListmonk(profiles: KlaviyoProfile[]): Promise<void> {
  console.log('\nImporting profiles to Listmonk...');

  // Get already migrated profiles
  const migrated = await getMigratedProfiles();
  console.log(`Already migrated: ${migrated.size} profiles`);

  // Filter out already migrated
  const toMigrate = profiles.filter((p) => !migrated.has(p.id));
  console.log(`Profiles to migrate: ${toMigrate.length}`);

  if (toMigrate.length === 0) {
    console.log('No new profiles to migrate.');
    return;
  }

  // Get or create the main BOO newsletter list
  let listId = 1; // Default list ID
  try {
    const lists = await listmonk.getLists();
    const booList = lists.find((l) => l.name.toLowerCase().includes('buy organics'));
    if (booList) {
      listId = booList.id;
    } else {
      // Create the list if it doesn't exist
      const newList = await listmonk.createList({
        name: 'Buy Organics Online Newsletter',
        type: 'public',
        optin: 'single',
      });
      listId = newList.id;
      console.log(`Created new list: ${newList.name} (ID: ${listId})`);
    }
  } catch (error) {
    console.warn('Could not get/create list, using default list ID 1');
  }

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const profile of toMigrate) {
    const email = profile.attributes.email;

    if (!email || !email.includes('@')) {
      console.log(`Skipping invalid email: ${email}`);
      await logMigration({
        klaviyo_profile_id: profile.id,
        email: email || 'unknown',
        migration_status: 'skipped',
        error_message: 'Invalid email address',
        source_data: profile,
      });
      skipCount++;
      continue;
    }

    try {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would import: ${email}`);
        successCount++;
        continue;
      }

      // Check if subscriber already exists in Listmonk
      const existing = await listmonk.getSubscriberByEmail(email);

      let listmonkId: number;

      if (existing) {
        // Update existing subscriber
        await listmonk.addSubscriberToLists(existing.id!, [listId]);
        listmonkId = existing.id!;
        console.log(`Updated existing subscriber: ${email}`);
      } else {
        // Create new subscriber
        const subscriber = await listmonk.createSubscriber({
          email,
          name: `${profile.attributes.first_name || ''} ${profile.attributes.last_name || ''}`.trim() || email.split('@')[0],
          status: 'enabled',
          lists: [listId],
          attribs: {
            klaviyo_id: profile.id,
            first_name: profile.attributes.first_name,
            last_name: profile.attributes.last_name,
            source: 'klaviyo_migration',
            migrated_at: new Date().toISOString(),
            ...profile.attributes.properties,
          },
        });
        listmonkId = subscriber.id!;
        console.log(`Created subscriber: ${email}`);
      }

      // Also add to Supabase subscribers table
      await supabase.rpc('boo_upsert_subscriber', {
        p_email: email,
        p_first_name: profile.attributes.first_name || null,
        p_last_name: profile.attributes.last_name || null,
        p_source: 'klaviyo_migration',
      });

      // Log successful migration
      await logMigration({
        klaviyo_profile_id: profile.id,
        email,
        migration_status: 'migrated',
        listmonk_subscriber_id: listmonkId,
        source_data: profile,
      });

      successCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to import ${email}: ${errorMessage}`);

      await logMigration({
        klaviyo_profile_id: profile.id,
        email,
        migration_status: 'failed',
        error_message: errorMessage,
        source_data: profile,
      });

      failCount++;
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log(`\nMigration Summary:`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  Skipped: ${skipCount}`);
}

async function main(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`BOO Klaviyo to Listmonk Migration`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    let profiles: KlaviyoProfile[];

    if (IMPORT_ONLY) {
      // Load from existing export
      console.log('Loading profiles from export file...');
      profiles = loadExportedProfiles();
    } else {
      // Fetch from Klaviyo
      if (!KLAVIYO_API_KEY) {
        throw new Error('BOO_KLAVIYO_API_KEY environment variable is required');
      }
      profiles = await fetchKlaviyoProfiles();

      // Export to file
      await exportProfiles(profiles);

      if (EXPORT_ONLY) {
        console.log('\nExport completed. Run with --import-only to import.');
        return;
      }
    }

    // Import to Listmonk
    await importToListmonk(profiles);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Migration completed: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
