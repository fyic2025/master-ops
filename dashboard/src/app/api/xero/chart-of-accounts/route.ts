import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { xeroClient } from '@/shared/libs/integrations/xero/client'

export const dynamic = 'force-dynamic'

// GET /api/xero/chart-of-accounts - List accounts
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams

    // Build query
    let query = supabase
      .from('xero_chart_of_accounts')
      .select('*')
      .order('code', { ascending: true })

    // Apply filters
    const business = searchParams.get('business')
    if (business) {
      query = query.eq('business_slug', business)
    }

    const type = searchParams.get('type')
    if (type) {
      query = query.eq('type', type)
    }

    const accountClass = searchParams.get('class')
    if (accountClass) {
      query = query.eq('class', accountClass)
    }

    const status = searchParams.get('status')
    if (status) {
      query = query.eq('status', status)
    } else {
      // Default to active only
      query = query.eq('status', 'ACTIVE')
    }

    const search = searchParams.get('search')
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
    }

    const { data: accounts, error } = await query

    if (error) {
      console.error('Chart of accounts fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by type for UI
    const grouped = accounts?.reduce((acc: any, account: any) => {
      const type = account.type || 'OTHER'
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(account)
      return acc
    }, {})

    return NextResponse.json({
      accounts: accounts || [],
      grouped: grouped || {},
      total: accounts?.length || 0,
    })
  } catch (error: any) {
    console.error('Chart of accounts API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/xero/chart-of-accounts - Sync from Xero
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { business } = body

    if (!business) {
      return NextResponse.json({ error: 'Business slug is required' }, { status: 400 })
    }

    // Get Xero tokens for this business
    const { data: tokenData, error: tokenError } = await supabase
      .from('xero_tokens')
      .select('*')
      .eq('business_slug', business)
      .eq('status', 'active')
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Xero not connected for this business. Please connect Xero first.' },
        { status: 400 }
      )
    }

    // Set tenant and tokens
    xeroClient.setTenant(tokenData.tenant_id)
    xeroClient.storeTokens(tokenData.tenant_id, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: 'Bearer',
      expires_in: Math.floor((new Date(tokenData.expires_at).getTime() - Date.now()) / 1000),
      scope: tokenData.scope || '',
    })

    // Fetch accounts from Xero
    const xeroAccounts = await xeroClient.accounts.list()

    // Sync to Supabase
    const synced: any[] = []
    const errors: any[] = []

    for (const account of xeroAccounts) {
      try {
        // Upsert account
        const { data: accountData, error: upsertError } = await supabase
          .from('xero_chart_of_accounts')
          .upsert(
            {
              business_slug: business,
              xero_account_id: account.AccountID,
              code: account.Code,
              name: account.Name,
              type: account.Type,
              class: account.Class,
              status: account.Status || 'ACTIVE',
              tax_type: account.TaxType,
              description: account.Description,
              last_synced_at: new Date().toISOString(),
              xero_raw_data: account,
            },
            {
              onConflict: 'business_slug,xero_account_id',
            }
          )
          .select()
          .single()

        if (upsertError) {
          errors.push({ account: account.Code, error: upsertError.message })
        } else {
          synced.push(accountData)
        }
      } catch (err: any) {
        errors.push({ account: account.Code, error: err.message })
      }
    }

    return NextResponse.json({
      success: true,
      synced: synced.length,
      errors: errors.length,
      details: {
        synced: synced.length,
        errors,
      },
    })
  } catch (error: any) {
    console.error('Chart of accounts sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
