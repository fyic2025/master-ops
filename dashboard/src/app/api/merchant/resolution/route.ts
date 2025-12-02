import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

interface ResolutionUpdate {
  issue_code: string
  status: 'pending' | 'in_progress' | 'fixed' | 'verified'
  fix_notes?: string
}

// GET - Fetch all resolution statuses for a business
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'

  try {
    const supabase = createServerClient()

    // Get account
    const { data: account, error: accountError } = await supabase
      .from('google_ads_accounts')
      .select('id')
      .eq('business', business)
      .single()

    if (accountError || !account) {
      return NextResponse.json({
        hasData: false,
        message: 'Google Merchant Center not configured for this business',
      })
    }

    // Fetch resolutions
    const { data: resolutions, error } = await supabase
      .from('gmc_issue_resolution')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        return NextResponse.json({
          hasData: true,
          resolutions: [],
          message: 'Resolution tracking table not yet created',
        })
      }
      throw error
    }

    return NextResponse.json({
      hasData: true,
      business,
      resolutions: resolutions || [],
    })

  } catch (error: any) {
    console.error('Resolution GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch resolutions' },
      { status: 500 }
    )
  }
}

// PUT - Update resolution status for an issue
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'

  try {
    const body: ResolutionUpdate = await request.json()
    const { issue_code, status, fix_notes } = body

    if (!issue_code || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: issue_code, status' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Get account
    const { data: account, error: accountError } = await supabase
      .from('google_ads_accounts')
      .select('id')
      .eq('business', business)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Get current issue count from audit data
    const { data: products } = await supabase
      .from('google_merchant_products')
      .select('item_issues')
      .eq('account_id', account.id)
      .not('item_issues', 'is', null)

    let productsAffected = 0
    let severity = 'warning'

    if (products) {
      for (const p of products) {
        if (p.item_issues && Array.isArray(p.item_issues)) {
          for (const issue of p.item_issues) {
            if (issue.code === issue_code) {
              productsAffected++
              severity = issue.severity || 'warning'
              break
            }
          }
        }
      }
    }

    // Upsert resolution record
    const updateData: any = {
      account_id: account.id,
      issue_code,
      severity,
      products_affected: productsAffected,
      status,
      fix_notes: fix_notes || null,
      updated_at: new Date().toISOString(),
    }

    // Set timestamps based on status
    if (status === 'fixed') {
      updateData.fixed_at = new Date().toISOString()
    } else if (status === 'verified') {
      updateData.verified_at = new Date().toISOString()
    }

    const { data: resolution, error } = await supabase
      .from('gmc_issue_resolution')
      .upsert(updateData, {
        onConflict: 'account_id,issue_code',
      })
      .select()
      .single()

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Resolution tracking table not yet created. Please run the migration.' },
          { status: 503 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      resolution,
    })

  } catch (error: any) {
    console.error('Resolution PUT error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update resolution' },
      { status: 500 }
    )
  }
}

// POST - Bulk update or trigger auto-fix (future enhancement)
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'
  const action = searchParams.get('action')

  try {
    const body = await request.json()

    if (action === 'mark_all_pending') {
      // Reset all to pending
      const supabase = createServerClient()

      const { data: account } = await supabase
        .from('google_ads_accounts')
        .select('id')
        .eq('business', business)
        .single()

      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      const { error } = await supabase
        .from('gmc_issue_resolution')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('account_id', account.id)

      if (error) throw error

      return NextResponse.json({ success: true, action: 'mark_all_pending' })
    }

    // Future: Add auto-fix triggers here
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (error: any) {
    console.error('Resolution POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process action' },
      { status: 500 }
    )
  }
}
