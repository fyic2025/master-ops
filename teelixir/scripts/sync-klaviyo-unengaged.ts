#!/usr/bin/env npx tsx
/**
 * Teelixir - Klaviyo Unengaged Segment Sync
 *
 * Syncs unengaged profiles from Klaviyo segment to Supabase.
 * Run weekly to keep the winback campaign pool up to date.
 *
 * Usage:
 *   npx tsx teelixir/scripts/sync-klaviyo-unengaged.ts [options]
 *
 * Options:
 *   --dry-run       Preview without writing to database
 *   --segment-id    Override segment ID (otherwise uses config)
 *   --list-segments List all Klaviyo segments and exit
 *
 * Environment Variables Required:
 *   Klaviyo API key loaded via creds.js
 *   SUPABASE_URL / SUPABASE_SERVICE_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config()

// Load credentials from vault
const credsPath = path.join(__dirname, '../../creds.js')
const creds = require(credsPath)

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 50
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

interface SyncConfig {
  dryRun: boolean
  segmentId: string | null
  listSegments: boolean
}

interface SyncResult {
  success: boolean
  profilesSynced: number
  profilesAdded: number
  profilesRemoved: number
  errors: string[]
  duration: number
}

// ============================================================================
// KLAVIYO CLIENT (Simplified for this script)
// ============================================================================

class KlaviyoClient {
  private apiKey: string
  private baseUrl = 'https://a.klaviyo.com'
  private apiRevision = '2024-10-15'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request<T>(
    method: string,
    path: string,
    params?: Record<string, any>,
    body?: any
  ): Promise<T> {
    const url = new URL(`/api${path}`, this.baseUrl)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
        'revision': this.apiRevision,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (response.status === 429) {
      console.log('  ⏳ Rate limited, waiting 2s...')
      await this.sleep(2000)
      return this.request<T>(method, path, params, body)
    }

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Klaviyo API error (${response.status}): ${errorBody}`)
    }

    if (response.status === 204) {
      return {} as T
    }

    return response.json() as Promise<T>
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async getSegments(): Promise<Array<{ id: string; name: string; isActive: boolean }>> {
    const segments: Array<{ id: string; name: string; isActive: boolean }> = []
    let nextCursor: string | null = null

    do {
      const params: Record<string, any> = {}
      if (nextCursor) {
        params['page[cursor]'] = nextCursor
      }

      const response = await this.request<any>('GET', '/segments', params)

      if (response.data) {
        for (const seg of response.data) {
          segments.push({
            id: seg.id,
            name: seg.attributes.name,
            isActive: seg.attributes.is_active,
          })
        }
      }

      nextCursor = response.links?.next
        ? new URL(response.links.next).searchParams.get('page[cursor]')
        : null

      await this.sleep(100)
    } while (nextCursor)

    return segments
  }

  async getSegmentProfiles(segmentId: string, onProgress?: (count: number) => void): Promise<any[]> {
    const profiles: any[] = []
    let nextCursor: string | null = null
    let pageNum = 0

    do {
      const params: Record<string, any> = {
        'page[size]': '100',
        'fields[profile]': 'email,first_name,last_name,properties',
      }

      if (nextCursor) {
        params['page[cursor]'] = nextCursor
      }

      const response = await this.request<any>('GET', `/segments/${segmentId}/profiles`, params)

      if (response.data) {
        profiles.push(...response.data)
        if (onProgress) {
          onProgress(profiles.length)
        }
      }

      nextCursor = response.links?.next
        ? new URL(response.links.next).searchParams.get('page[cursor]')
        : null

      pageNum++
      await this.sleep(50)
    } while (nextCursor)

    return profiles
  }

  async getListProfiles(listId: string, onProgress?: (count: number) => void): Promise<any[]> {
    const profiles: any[] = []
    let nextCursor: string | null = null
    let pageNum = 0

    do {
      const params: Record<string, any> = {
        'page[size]': '100',
        'fields[profile]': 'email,first_name,last_name,properties',
      }

      if (nextCursor) {
        params['page[cursor]'] = nextCursor
      }

      const response = await this.request<any>('GET', `/lists/${listId}/profiles`, params)

      if (response.data) {
        profiles.push(...response.data)
        if (onProgress) {
          onProgress(profiles.length)
        }
      }

      nextCursor = response.links?.next
        ? new URL(response.links.next).searchParams.get('page[cursor]')
        : null

      pageNum++
      await this.sleep(50)
    } while (nextCursor)

    return profiles
  }
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

async function syncKlaviyoUnengaged(config: SyncConfig): Promise<SyncResult> {
  const startTime = Date.now()
  const result: SyncResult = {
    success: false,
    profilesSynced: 0,
    profilesAdded: 0,
    profilesRemoved: 0,
    errors: [],
    duration: 0,
  }

  try {
    // Initialize credentials
    console.log('\n🔐 Loading credentials...')
    await creds.load('teelixir')

    const klaviyoApiKey = await creds.get('teelixir', 'klaviyo_api_key')
    if (!klaviyoApiKey) {
      throw new Error('Klaviyo API key not found in vault')
    }

    const supabaseKey = process.env.SUPABASE_SERVICE_KEY ||
      await creds.get('global', 'supabase_service_key') ||
      SUPABASE_SERVICE_KEY_FALLBACK

    // Initialize clients
    const klaviyo = new KlaviyoClient(klaviyoApiKey)
    const supabase = createClient(SUPABASE_URL, supabaseKey)

    // List segments if requested
    if (config.listSegments) {
      console.log('\n📋 Fetching Klaviyo segments...')
      const segments = await klaviyo.getSegments()

      console.log('\n┌─────────────────────────────────────────────────────────────────────┐')
      console.log('│ KLAVIYO SEGMENTS                                                    │')
      console.log('├─────────────────────────────────────────────────────────────────────┤')

      for (const seg of segments) {
        const status = seg.isActive ? '🟢' : '⚪'
        console.log(`│ ${status} ${seg.id.padEnd(26)} │ ${seg.name.substring(0, 35).padEnd(35)} │`)
      }

      console.log('└─────────────────────────────────────────────────────────────────────┘')
      console.log(`\nFound ${segments.length} segments.`)
      console.log('To sync: npx tsx teelixir/scripts/sync-klaviyo-unengaged.ts --segment-id=YOUR_ID')

      result.success = true
      return result
    }

    // Get list ID or segment ID from config or parameter
    let listId: string | null = null
    let segmentId = config.segmentId

    if (!segmentId) {
      // Try to get from automation config (prefer list over segment)
      const { data: configData } = await supabase
        .from('tlx_automation_config')
        .select('config')
        .eq('automation_type', 'winback_40')
        .single()

      listId = configData?.config?.klaviyo_list_id
      segmentId = configData?.config?.klaviyo_segment_id
    }

    if (!listId && !segmentId) {
      // List segments and ask user to set one
      console.log('\n⚠️  No list/segment ID configured. Listing available segments...')
      const segments = await klaviyo.getSegments()

      // Find segments that might be unengaged
      const unengagedSegments = segments.filter(s =>
        s.name.toLowerCase().includes('unengaged') ||
        s.name.toLowerCase().includes('inactive') ||
        s.name.toLowerCase().includes('lapsed') ||
        s.name.toLowerCase().includes('dormant')
      )

      if (unengagedSegments.length > 0) {
        console.log('\n📋 Potential unengaged segments found:')
        for (const seg of unengagedSegments) {
          console.log(`   ${seg.id} - ${seg.name}`)
        }
      } else {
        console.log('\n📋 All segments:')
        for (const seg of segments.slice(0, 20)) {
          console.log(`   ${seg.id} - ${seg.name}`)
        }
        if (segments.length > 20) {
          console.log(`   ... and ${segments.length - 20} more`)
        }
      }

      console.log('\n💡 Run with --segment-id=YOUR_ID or update tlx_automation_config.config.klaviyo_list_id')
      throw new Error('No list/segment ID configured')
    }

    // Fetch profiles from list or segment
    let profiles: any[]

    if (listId) {
      console.log(`\n📥 Fetching profiles from list: ${listId}`)
      profiles = await klaviyo.getListProfiles(listId, (count) => {
        process.stdout.write(`\r   Fetched ${count} profiles...`)
      })
    } else {
      console.log(`\n📥 Fetching profiles from segment: ${segmentId}`)
      profiles = await klaviyo.getSegmentProfiles(segmentId!, (count) => {
        process.stdout.write(`\r   Fetched ${count} profiles...`)
      })
    }

    console.log(`\n   ✅ Total profiles: ${profiles.length}`)

    if (config.dryRun) {
      console.log('\n🔍 DRY RUN - Would sync these profiles:')
      for (const p of profiles.slice(0, 10)) {
        const email = p.attributes?.email || 'N/A'
        const name = p.attributes?.first_name || 'N/A'
        console.log(`   - ${email} (${name})`)
      }
      if (profiles.length > 10) {
        console.log(`   ... and ${profiles.length - 10} more`)
      }
      result.success = true
      result.profilesSynced = profiles.length
      return result
    }

    // Transform profiles for Supabase
    const transformedProfiles = profiles.map(p => ({
      klaviyo_profile_id: p.id,
      email: p.attributes?.email || '',
      first_name: p.attributes?.first_name || null,
      last_name: p.attributes?.last_name || null,
      last_order_date: p.attributes?.properties?.last_order_date || null,
      total_orders: p.attributes?.properties?.total_orders || 0,
      synced_at: new Date().toISOString(),
    })).filter(p => p.email) // Only profiles with email

    console.log(`\n💾 Syncing ${transformedProfiles.length} profiles to Supabase...`)

    // Get existing profile IDs
    const { data: existingProfiles } = await supabase
      .from('tlx_klaviyo_unengaged')
      .select('klaviyo_profile_id')

    const existingIds = new Set((existingProfiles || []).map(p => p.klaviyo_profile_id))
    const newIds = new Set(transformedProfiles.map(p => p.klaviyo_profile_id))

    // Find profiles to remove (no longer in segment)
    const toRemove = [...existingIds].filter(id => !newIds.has(id))

    // Upsert in batches
    for (let i = 0; i < transformedProfiles.length; i += BATCH_SIZE) {
      const batch = transformedProfiles.slice(i, i + BATCH_SIZE)

      const { error } = await supabase
        .from('tlx_klaviyo_unengaged')
        .upsert(batch, {
          onConflict: 'klaviyo_profile_id',
        })

      if (error) {
        result.errors.push(`Batch ${i / BATCH_SIZE + 1} error: ${error.message}`)
      } else {
        result.profilesAdded += batch.filter(p => !existingIds.has(p.klaviyo_profile_id)).length
      }

      process.stdout.write(`\r   Processed ${Math.min(i + BATCH_SIZE, transformedProfiles.length)}/${transformedProfiles.length}...`)
    }

    console.log('')

    // Remove profiles no longer in segment
    if (toRemove.length > 0) {
      console.log(`\n🗑️  Removing ${toRemove.length} profiles no longer in segment...`)

      const { error } = await supabase
        .from('tlx_klaviyo_unengaged')
        .delete()
        .in('klaviyo_profile_id', toRemove)

      if (error) {
        result.errors.push(`Remove error: ${error.message}`)
      } else {
        result.profilesRemoved = toRemove.length
      }
    }

    result.profilesSynced = transformedProfiles.length
    result.success = result.errors.length === 0

    // Update automation config with last run info
    const { error: updateError } = await supabase
      .from('tlx_automation_config')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_result: {
          type: 'sync',
          profiles_synced: result.profilesSynced,
          profiles_added: result.profilesAdded,
          profiles_removed: result.profilesRemoved,
          errors: result.errors,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('automation_type', 'winback_40')

    if (updateError) {
      console.log(`\n⚠️  Could not update automation config: ${updateError.message}`)
    }

  } catch (error: any) {
    result.errors.push(error.message)
    result.success = false
  }

  result.duration = Date.now() - startTime
  return result
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2)

  const config: SyncConfig = {
    dryRun: args.includes('--dry-run'),
    segmentId: args.find(a => a.startsWith('--segment-id='))?.split('=')[1] || null,
    listSegments: args.includes('--list-segments'),
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║  TEELIXIR - KLAVIYO UNENGAGED SEGMENT SYNC                           ║')
  console.log('║  Syncs unengaged profiles to Supabase for winback campaign           ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')

  if (config.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made')
  }

  const result = await syncKlaviyoUnengaged(config)

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐')
  console.log('│ SYNC RESULTS                                                        │')
  console.log('├─────────────────────────────────────────────────────────────────────┤')
  console.log(`│ Status:           ${result.success ? '✅ SUCCESS' : '❌ FAILED'}                                      │`)
  console.log(`│ Profiles synced:  ${String(result.profilesSynced).padEnd(49)}│`)
  console.log(`│ Profiles added:   ${String(result.profilesAdded).padEnd(49)}│`)
  console.log(`│ Profiles removed: ${String(result.profilesRemoved).padEnd(49)}│`)
  console.log(`│ Duration:         ${String((result.duration / 1000).toFixed(1) + 's').padEnd(49)}│`)

  if (result.errors.length > 0) {
    console.log('├─────────────────────────────────────────────────────────────────────┤')
    console.log('│ ERRORS:                                                             │')
    for (const err of result.errors.slice(0, 5)) {
      console.log(`│   - ${err.substring(0, 62).padEnd(62)}│`)
    }
  }

  console.log('└─────────────────────────────────────────────────────────────────────┘')

  process.exit(result.success ? 0 : 1)
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message)
  process.exit(1)
})
