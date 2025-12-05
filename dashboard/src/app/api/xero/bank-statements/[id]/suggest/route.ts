import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/xero/bank-statements/[id]/suggest - Get AI suggestions for statement
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { id } = params

    // Get statement
    const { data: statement, error: fetchError } = await supabase
      .from('xero_bank_statements')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 })
    }

    // Get AI suggestion using the pattern matching function
    const { data: suggestion, error: suggestionError } = await supabase
      .rpc('suggest_reconciliation_match', {
        p_business_slug: statement.business_slug,
        p_description: statement.description,
        p_amount: statement.amount,
        p_reference: statement.reference || null,
        p_payee: statement.payee || null,
      })
      .single()

    if (suggestionError && suggestionError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Suggestion error:', suggestionError)
    }

    // Get top 5 most frequently used accounts for this business
    const { data: frequentAccounts } = await supabase
      .from('xero_chart_of_accounts')
      .select('*')
      .eq('business_slug', statement.business_slug)
      .eq('status', 'ACTIVE')
      .order('use_count', { ascending: false })
      .limit(5)

    // Get recently used accounts
    const { data: recentAccounts } = await supabase
      .from('xero_chart_of_accounts')
      .select('*')
      .eq('business_slug', statement.business_slug)
      .eq('status', 'ACTIVE')
      .not('last_used_at', 'is', null)
      .order('last_used_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      suggestion: suggestion || null,
      alternatives: {
        frequent: frequentAccounts || [],
        recent: recentAccounts || [],
      },
    })
  } catch (error: any) {
    console.error('Suggestion API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
