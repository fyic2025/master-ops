import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { xeroClient } from '@/shared/libs/integrations/xero/client'

export const dynamic = 'force-dynamic'

// GET /api/xero/bank-statements - List unreconciled bank statements
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams

    // Build query
    let query = supabase
      .from('xero_bank_statements')
      .select('*')
      .order('date', { ascending: false })

    // Apply filters
    const business = searchParams.get('business')
    if (business) {
      query = query.eq('business_slug', business)
    }

    const reconciled = searchParams.get('reconciled')
    if (reconciled !== null) {
      query = query.eq('is_reconciled', reconciled === 'true')
    }

    const fromDate = searchParams.get('from')
    if (fromDate) {
      query = query.gte('date', fromDate)
    }

    const toDate = searchParams.get('to')
    if (toDate) {
      query = query.lte('date', toDate)
    }

    const limit = searchParams.get('limit')
    if (limit) {
      query = query.limit(parseInt(limit))
    } else {
      query = query.limit(100)
    }

    const { data: statements, error } = await query

    if (error) {
      console.error('Bank statements fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate summary stats
    const summary = {
      total: statements?.length || 0,
      unreconciled: statements?.filter(s => !s.is_reconciled).length || 0,
      reconciled: statements?.filter(s => s.is_reconciled).length || 0,
      totalAmount: statements?.reduce((sum, s) => sum + Number(s.amount), 0) || 0,
    }

    return NextResponse.json({
      statements: statements || [],
      summary,
    })
  } catch (error: any) {
    console.error('Bank statements API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/xero/bank-statements - Import bank statements from Xero
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { business, fromDate, toDate, bankAccountId } = body

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

    // Build query options for Xero
    const queryOptions: any = {
      where: 'IsReconciled==false',
    }

    if (fromDate) {
      queryOptions.fromDate = fromDate
    }
    if (toDate) {
      queryOptions.toDate = toDate
    }

    // Fetch unreconciled bank transactions from Xero
    const xeroTransactions = await xeroClient.bankTransactions.list(queryOptions)

    // Filter by bank account if specified
    let filteredTransactions = xeroTransactions
    if (bankAccountId) {
      filteredTransactions = xeroTransactions.filter(
        tx => tx.BankAccount.AccountID === bankAccountId
      )
    }

    // Import into Supabase
    const imported: any[] = []
    const errors: any[] = []

    for (const tx of filteredTransactions) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('xero_bank_statements')
          .select('id')
          .eq('statement_line_id', tx.BankTransactionID)
          .single()

        if (existing) {
          // Already imported, skip
          continue
        }

        // Get AI suggestion for this transaction
        const { data: suggestion } = await supabase
          .rpc('suggest_reconciliation_match', {
            p_business_slug: business,
            p_description: tx.LineItems?.[0]?.Description || '',
            p_amount: tx.Total,
            p_reference: tx.Reference || null,
            p_payee: tx.Contact?.Name || null,
          })
          .single()

        // Insert statement
        const { data: statement, error: insertError } = await supabase
          .from('xero_bank_statements')
          .insert({
            business_slug: business,
            bank_account_id: tx.BankAccount.AccountID,
            bank_account_name: tx.BankAccount.Name,
            statement_line_id: tx.BankTransactionID,
            date: tx.Date,
            amount: tx.Total,
            description: tx.LineItems?.[0]?.Description || '',
            reference: tx.Reference,
            payee: tx.Contact?.Name,
            is_reconciled: tx.IsReconciled,
            suggested_account_code: suggestion?.account_code || null,
            suggested_account_name: suggestion?.account_name || null,
            suggested_contact_id: suggestion?.contact_id || null,
            suggested_contact_name: suggestion?.contact_name || null,
            confidence_score: suggestion?.confidence || null,
            xero_raw_data: tx,
          })
          .select()
          .single()

        if (insertError) {
          errors.push({ transaction: tx.BankTransactionID, error: insertError.message })
        } else {
          imported.push(statement)
        }
      } catch (err: any) {
        errors.push({ transaction: tx.BankTransactionID, error: err.message })
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      skipped: filteredTransactions.length - imported.length - errors.length,
      errors: errors.length,
      details: {
        imported,
        errors,
      },
    })
  } catch (error: any) {
    console.error('Bank statements import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
