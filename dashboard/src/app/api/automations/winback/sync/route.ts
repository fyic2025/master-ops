import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import https from 'https'
import crypto from 'crypto'

// Vault configuration (same as other winback routes)
const VAULT_CONFIG = {
  host: 'usibnysqelovfuctmkqw.supabase.co',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s',
  encryptionKey: 'mstr-ops-vault-2024-secure-key'
}

const BATCH_SIZE = 50

function decryptVaultValue(encryptedValue: string): string | null {
  try {
    const buffer = Buffer.from(encryptedValue, 'base64')
    const iv = buffer.subarray(0, 16)
    const encrypted = buffer.subarray(16)
    const key = crypto.createHash('sha256').update(VAULT_CONFIG.encryptionKey).digest()
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    return null
  }
}

function fetchVaultCred(name: string): Promise<string | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: VAULT_CONFIG.host,
      port: 443,
      path: `/rest/v1/secure_credentials?project=eq.teelixir&name=eq.${name}&select=encrypted_value`,
      method: 'GET',
      headers: {
        'apikey': VAULT_CONFIG.serviceKey,
        'Authorization': `Bearer ${VAULT_CONFIG.serviceKey}`,
      }
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const rows = JSON.parse(data)
          if (rows.length > 0 && rows[0].encrypted_value) {
            resolve(decryptVaultValue(rows[0].encrypted_value))
          } else {
            resolve(null)
          }
        } catch {
          resolve(null)
        }
      })
    })
    req.on('error', () => resolve(null))
    req.end()
  })
}

// Klaviyo API helper
async function klaviyoRequest<T>(
  apiKey: string,
  method: string,
  path: string,
  params?: Record<string, any>
): Promise<T> {
  const url = new URL(`/api${path}`, 'https://a.klaviyo.com')

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
      'Authorization': `Klaviyo-API-Key ${apiKey}`,
      'revision': '2024-10-15',
      'Accept': 'application/json',
    },
  })

  if (response.status === 429) {
    // Rate limited - wait and retry
    await new Promise(r => setTimeout(r, 2000))
    return klaviyoRequest<T>(apiKey, method, path, params)
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

async function getKlaviyoListProfiles(
  apiKey: string,
  listId: string,
  onProgress?: (count: number) => void
): Promise<any[]> {
  const profiles: any[] = []
  let nextCursor: string | null = null

  do {
    const params: Record<string, any> = {
      'page[size]': '100',
      'fields[profile]': 'email,first_name,last_name,properties',
    }
    if (nextCursor) {
      params['page[cursor]'] = nextCursor
    }

    const response = await klaviyoRequest<any>(apiKey, 'GET', `/lists/${listId}/profiles`, params)

    if (response.data) {
      profiles.push(...response.data)
      onProgress?.(profiles.length)
    }

    nextCursor = response.links?.next
      ? new URL(response.links.next).searchParams.get('page[cursor]')
      : null

    await new Promise(r => setTimeout(r, 50))
  } while (nextCursor)

  return profiles
}

// POST /api/automations/winback/sync - Trigger Klaviyo sync (inlined)
export async function POST() {
  try {
    const supabase = createServerClient()
    const startTime = Date.now()

    console.log('[Winback Sync] Manual sync triggered from dashboard')

    // Update status to running
    await supabase
      .from('tlx_automation_config')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_result: {
          type: 'sync',
          triggered_from: 'dashboard',
          status: 'running',
          started_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('automation_type', 'winback_40')

    try {
      // Get Klaviyo API key from vault
      const klaviyoApiKey = await fetchVaultCred('klaviyo_api_key')
      if (!klaviyoApiKey) {
        throw new Error('Klaviyo API key not found in vault')
      }

      // Get list ID from automation config
      const { data: configData } = await supabase
        .from('tlx_automation_config')
        .select('config')
        .eq('automation_type', 'winback_40')
        .single()

      const listId = configData?.config?.klaviyo_list_id
      const segmentId = configData?.config?.klaviyo_segment_id

      if (!listId && !segmentId) {
        throw new Error('No Klaviyo list_id or segment_id configured in winback_40 config')
      }

      // Fetch profiles from Klaviyo
      console.log(`[Winback Sync] Fetching profiles from ${listId ? 'list' : 'segment'}: ${listId || segmentId}`)

      let profiles: any[]
      if (listId) {
        profiles = await getKlaviyoListProfiles(klaviyoApiKey, listId)
      } else {
        // Use segment endpoint
        profiles = []
        let nextCursor: string | null = null
        do {
          const params: Record<string, any> = {
            'page[size]': '100',
            'fields[profile]': 'email,first_name,last_name,properties',
          }
          if (nextCursor) {
            params['page[cursor]'] = nextCursor
          }
          const response = await klaviyoRequest<any>(klaviyoApiKey, 'GET', `/segments/${segmentId}/profiles`, params)
          if (response.data) {
            profiles.push(...response.data)
          }
          nextCursor = response.links?.next
            ? new URL(response.links.next).searchParams.get('page[cursor]')
            : null
          await new Promise(r => setTimeout(r, 50))
        } while (nextCursor)
      }

      console.log(`[Winback Sync] Total profiles: ${profiles.length}`)

      // Transform profiles for Supabase
      const transformedProfiles = profiles.map(p => ({
        klaviyo_profile_id: p.id,
        email: p.attributes?.email || '',
        first_name: p.attributes?.first_name || null,
        last_name: p.attributes?.last_name || null,
        last_order_date: p.attributes?.properties?.last_order_date || null,
        total_orders: p.attributes?.properties?.total_orders || 0,
        synced_at: new Date().toISOString(),
      })).filter(p => p.email)

      // Get existing profile IDs for diffing
      const { data: existingProfiles } = await supabase
        .from('tlx_klaviyo_unengaged')
        .select('klaviyo_profile_id')

      const existingIds = new Set((existingProfiles || []).map(p => p.klaviyo_profile_id))
      const newIds = new Set(transformedProfiles.map(p => p.klaviyo_profile_id))
      const toRemove = [...existingIds].filter(id => !newIds.has(id))

      let profilesAdded = 0
      const errors: string[] = []

      // Upsert in batches
      for (let i = 0; i < transformedProfiles.length; i += BATCH_SIZE) {
        const batch = transformedProfiles.slice(i, i + BATCH_SIZE)

        const { error } = await supabase
          .from('tlx_klaviyo_unengaged')
          .upsert(batch, { onConflict: 'klaviyo_profile_id' })

        if (error) {
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${error.message}`)
        } else {
          profilesAdded += batch.filter(p => !existingIds.has(p.klaviyo_profile_id)).length
        }
      }

      // Remove profiles no longer in segment
      let profilesRemoved = 0
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('tlx_klaviyo_unengaged')
          .delete()
          .in('klaviyo_profile_id', toRemove)

        if (error) {
          errors.push(`Remove error: ${error.message}`)
        } else {
          profilesRemoved = toRemove.length
        }
      }

      const success = errors.length === 0
      console.log(`[Winback Sync] Profiles synced: ${transformedProfiles.length}, added: ${profilesAdded}, removed: ${profilesRemoved}`)

      // Update job status to healthy
      await supabase
        .from('dashboard_job_status')
        .update({
          last_run_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          status: 'healthy',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('job_name', 'winback-klaviyo-sync')
        .eq('business', 'teelixir')

      // Update automation config with result
      await supabase
        .from('tlx_automation_config')
        .update({
          last_run_result: {
            type: 'sync',
            triggered_from: 'dashboard',
            status: success ? 'success' : 'partial',
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
            profiles_synced: transformedProfiles.length,
            profiles_added: profilesAdded,
            profiles_removed: profilesRemoved,
            errors: errors.length > 0 ? errors : undefined
          },
          updated_at: new Date().toISOString()
        })
        .eq('automation_type', 'winback_40')

      return NextResponse.json({
        success: true,
        message: 'Sync completed successfully',
        profiles_synced: transformedProfiles.length,
        profiles_added: profilesAdded,
        profiles_removed: profilesRemoved,
        duration_ms: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined
      })

    } catch (execError: any) {
      console.error('[Winback Sync] Error:', execError)

      // Update job status to failed
      await supabase
        .from('dashboard_job_status')
        .update({
          last_run_at: new Date().toISOString(),
          status: 'failed',
          error_message: execError.message,
          updated_at: new Date().toISOString()
        })
        .eq('job_name', 'winback-klaviyo-sync')
        .eq('business', 'teelixir')

      // Update automation config with failure
      await supabase
        .from('tlx_automation_config')
        .update({
          last_run_result: {
            type: 'sync',
            triggered_from: 'dashboard',
            status: 'failed',
            error: execError.message,
            completed_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('automation_type', 'winback_40')

      return NextResponse.json({
        success: false,
        error: execError.message
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Winback sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
