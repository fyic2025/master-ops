import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/xero/bank-statements/[id] - Get a specific statement
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { id } = params

    const { data: statement, error } = await supabase
      .from('xero_bank_statements')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Statement fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ statement })
  } catch (error: any) {
    console.error('Statement API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/xero/bank-statements/[id] - Update reconciliation
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { id } = params
    const body = await request.json()

    // Get current statement
    const { data: statement, error: fetchError } = await supabase
      .from('xero_bank_statements')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}

    if (body.matched_account_code) {
      updateData.matched_account_code = body.matched_account_code
    }
    if (body.matched_account_id) {
      updateData.matched_account_id = body.matched_account_id
    }
    if (body.matched_contact_id) {
      updateData.matched_contact_id = body.matched_contact_id
    }
    if (body.is_reconciled !== undefined) {
      updateData.is_reconciled = body.is_reconciled
      if (body.is_reconciled) {
        updateData.reconciled_at = new Date().toISOString()
        updateData.reconciled_by = body.reconciled_by || 'dashboard'
      }
    }

    // Update statement
    const { data: updated, error: updateError } = await supabase
      .from('xero_bank_statements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Record in history
    if (body.is_reconciled && body.matched_account_code) {
      const wasSuggested = statement.suggested_account_code === body.matched_account_code
      const wasModified = statement.suggested_account_code && !wasSuggested

      await supabase.from('xero_reconciliation_history').insert({
        business_slug: statement.business_slug,
        statement_line_id: id,
        matched_account_code: body.matched_account_code,
        matched_account_name: body.matched_account_name || null,
        matched_contact_id: body.matched_contact_id || null,
        matched_contact_name: body.matched_contact_name || null,
        was_suggested: wasSuggested,
        suggestion_confidence: statement.confidence_score,
        was_modified: wasModified,
        user_approved: true,
        reconciled_by: body.reconciled_by || 'dashboard',
      })

      // Create or update pattern
      if (body.create_pattern !== false) {
        await supabase.rpc('create_pattern_from_reconciliation', {
          p_business_slug: statement.business_slug,
          p_description: statement.description,
          p_account_code: body.matched_account_code,
          p_account_name: body.matched_account_name || null,
          p_contact_id: body.matched_contact_id || null,
          p_contact_name: body.matched_contact_name || null,
          p_statement_id: id,
        })
      }

      // Increment account use_count
      if (body.matched_account_id) {
        await supabase
          .from('xero_chart_of_accounts')
          .update({
            use_count: supabase.raw('use_count + 1'),
            last_used_at: new Date().toISOString(),
          })
          .eq('business_slug', statement.business_slug)
          .eq('xero_account_id', body.matched_account_id)
      }
    }

    return NextResponse.json({ statement: updated })
  } catch (error: any) {
    console.error('Statement update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
