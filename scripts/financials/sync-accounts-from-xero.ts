/**
 * Sync Accounts from Xero to Supabase
 *
 * Fetches chart of accounts from Teelixir and Elevate Xero orgs
 * and stores them in Supabase for mapping.
 *
 * Prerequisites:
 * - schema-financials.sql deployed to Supabase
 * - Xero credentials in .env
 *
 * Usage:
 *   npx tsx scripts/financials/sync-accounts-from-xero.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env from project root
const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath })

interface BusinessConfig {
  key: string
  name: string
  clientId: string
  clientSecret: string
  refreshToken: string
  tenantId: string
}

const BUSINESSES: BusinessConfig[] = [
  {
    key: 'teelixir',
    name: 'Teelixir',
    clientId: process.env.XERO_TEELIXIR_CLIENT_ID || '',
    clientSecret: process.env.XERO_TEELIXIR_CLIENT_SECRET || '',
    refreshToken: process.env.XERO_TEELIXIR_REFRESH_TOKEN || '',
    tenantId: process.env.XERO_TEELIXIR_TENANT_ID || '',
  },
  {
    key: 'elevate',
    name: 'Elevate Wholesale',
    clientId: process.env.XERO_ELEVATE_CLIENT_ID || '',
    clientSecret: process.env.XERO_ELEVATE_CLIENT_SECRET || '',
    refreshToken: process.env.XERO_ELEVATE_REFRESH_TOKEN || '',
    tenantId: process.env.XERO_ELEVATE_TENANT_ID || '',
  },
]

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function refreshToken(config: BusinessConfig): Promise<{ access_token: string; refresh_token: string }> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
    }),
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} - ${text.substring(0, 200)}`)
  }

  return JSON.parse(text)
}

async function getOrganisation(accessToken: string, tenantId: string): Promise<any> {
  const response = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      'Accept': 'application/json',
    },
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Get org failed: ${response.status} - ${text.substring(0, 200)}`)
  }

  return JSON.parse(text)
}

async function getAccounts(accessToken: string, tenantId: string): Promise<any[]> {
  const response = await fetch('https://api.xero.com/api.xro/2.0/Accounts', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      'Accept': 'application/json',
    },
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Get accounts failed: ${response.status} - ${text.substring(0, 200)}`)
  }

  const data = JSON.parse(text)
  return data.Accounts || []
}

async function ensureOrganization(config: BusinessConfig, org: any): Promise<string> {
  // Check if org exists
  const { data: existing } = await supabase
    .from('xero_organizations')
    .select('id')
    .eq('xero_tenant_id', config.tenantId)
    .single()

  if (existing) {
    console.log(`   Organization ${config.name} already exists (${existing.id})`)
    return existing.id
  }

  // Insert new org
  const { data: newOrg, error } = await supabase
    .from('xero_organizations')
    .insert({
      xero_tenant_id: config.tenantId,
      business_key: config.key,
      name: org.Name,
      legal_name: org.LegalName,
      base_currency: org.BaseCurrency || 'AUD',
      country_code: org.CountryCode || 'AU',
      financial_year_end_month: org.FinancialYearEndMonth,
      financial_year_end_day: org.FinancialYearEndDay,
      is_demo_company: org.IsDemoCompany || false,
      last_synced_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to insert org: ${error.message}`)
  }

  console.log(`   Created organization ${config.name} (${newOrg.id})`)
  return newOrg.id
}

async function syncAccounts(orgId: string, accounts: any[]): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0

  for (const account of accounts) {
    const accountData = {
      organization_id: orgId,
      xero_account_id: account.AccountID,
      code: account.Code || 'NO_CODE',
      name: account.Name,
      account_type: account.Type,
      account_class: account.Class,
      status: account.Status || 'ACTIVE',
      description: account.Description,
      tax_type: account.TaxType,
      enable_payments_to_account: account.EnablePaymentsToAccount || false,
      show_in_expense_claims: account.ShowInExpenseClaims || false,
      bank_account_number: account.BankAccountNumber,
      bank_account_type: account.BankAccountType,
      currency_code: account.CurrencyCode || 'AUD',
      reporting_code: account.ReportingCode,
      reporting_code_name: account.ReportingCodeName,
      has_attachments: account.HasAttachments || false,
      xero_updated_at: account.UpdatedDateUTC ? new Date(parseInt(account.UpdatedDateUTC.match(/\d+/)?.[0] || '0')).toISOString() : null,
    }

    // Upsert account
    const { error } = await supabase
      .from('accounts')
      .upsert(accountData, {
        onConflict: 'organization_id,xero_account_id',
      })

    if (error) {
      console.error(`   Error syncing account ${account.Code}: ${error.message}`)
    } else {
      // Check if it was an insert or update based on presence
      const { data: existing } = await supabase
        .from('accounts')
        .select('created_at, updated_at')
        .eq('organization_id', orgId)
        .eq('xero_account_id', account.AccountID)
        .single()

      if (existing && existing.created_at === existing.updated_at) {
        created++
      } else {
        updated++
      }
    }
  }

  return { created, updated }
}

async function main() {
  console.log('\n📊 Syncing Accounts from Xero to Supabase')
  console.log('='.repeat(60))

  // Only sync Teelixir and Elevate (for consolidation)
  for (const biz of BUSINESSES) {
    console.log(`\n🏢 Processing ${biz.name}...`)

    try {
      // Refresh token
      console.log('   Refreshing Xero token...')
      const token = await refreshToken(biz)

      // Get organization details
      console.log('   Fetching organization...')
      const orgResponse = await getOrganisation(token.access_token, biz.tenantId)
      const org = orgResponse.Organisations?.[0]

      if (!org) {
        console.error(`   No organization found for ${biz.name}`)
        continue
      }

      // Ensure org exists in Supabase
      const orgId = await ensureOrganization(biz, org)

      // Fetch accounts from Xero
      console.log('   Fetching accounts...')
      const accounts = await getAccounts(token.access_token, biz.tenantId)
      console.log(`   Found ${accounts.length} accounts`)

      // Sync to Supabase
      console.log('   Syncing to Supabase...')
      const result = await syncAccounts(orgId, accounts)
      console.log(`   ✅ Synced: ${result.created} created, ${result.updated} updated`)

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 SYNC COMPLETE')

  // Show account counts
  const { data: teelixirAccounts } = await supabase
    .from('accounts')
    .select('id', { count: 'exact' })
    .eq('organization_id', (await supabase.from('xero_organizations').select('id').eq('business_key', 'teelixir').single()).data?.id)

  const { data: elevateAccounts } = await supabase
    .from('accounts')
    .select('id', { count: 'exact' })
    .eq('organization_id', (await supabase.from('xero_organizations').select('id').eq('business_key', 'elevate').single()).data?.id)

  console.log(`   Teelixir accounts: ${teelixirAccounts?.length || 0}`)
  console.log(`   Elevate accounts: ${elevateAccounts?.length || 0}`)
  console.log('\n')
}

main().catch(console.error)
