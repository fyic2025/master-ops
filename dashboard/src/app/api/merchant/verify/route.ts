import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

interface VerifyRequest {
  business?: string
  issueCode?: string
  batchId?: string
  offerIds?: string[]
}

// POST - Verify fixes by checking if issues are resolved
export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json()
    const { business = 'boo', issueCode, batchId, offerIds } = body

    const supabase = createServerClient()

    // Get account for this business
    const { data: account, error: accountError } = await supabase
      .from('google_ads_accounts')
      .select('id')
      .eq('business', business)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found for business: ' + business },
        { status: 404 }
      )
    }

    // Get fixed items to verify
    let fixQuery = supabase
      .from('gmc_fix_history')
      .select('*')
      .eq('account_id', account.id)
      .is('verified_at', null) // Only verify unverified fixes

    if (issueCode) {
      fixQuery = fixQuery.eq('issue_code', issueCode)
    }

    if (offerIds && offerIds.length > 0) {
      fixQuery = fixQuery.in('offer_id', offerIds)
    }

    const { data: fixHistory, error: fixError } = await fixQuery.limit(100)

    if (fixError) throw fixError

    if (!fixHistory || fixHistory.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No fixes to verify',
        verified: 0,
        stillPresent: 0
      })
    }

    // Get current GMC product data to check if issues still exist
    const offerIdsToCheck = [...new Set(fixHistory.map(f => f.offer_id))]

    const { data: products, error: productsError } = await supabase
      .from('google_merchant_products')
      .select('offer_id, item_issues')
      .eq('account_id', account.id)
      .in('offer_id', offerIdsToCheck)

    if (productsError) throw productsError

    // Build a map of current issues by offer_id
    const currentIssuesByOffer = new Map<string, Set<string>>()
    for (const product of products || []) {
      const issues = new Set<string>()
      if (product.item_issues && Array.isArray(product.item_issues)) {
        for (const issue of product.item_issues) {
          if (issue.code) issues.add(issue.code)
        }
      }
      currentIssuesByOffer.set(product.offer_id, issues)
    }

    // Verify each fix
    const results = {
      verified: 0,
      stillPresent: 0,
      newIssue: 0,
      errors: [] as Array<{ offerId: string; error: string }>
    }

    for (const fix of fixHistory) {
      const currentIssues = currentIssuesByOffer.get(fix.offer_id)

      let verificationResult: 'resolved' | 'still_present' | 'new_issue'

      if (!currentIssues) {
        // Product no longer in GMC - assume resolved or removed
        verificationResult = 'resolved'
        results.verified++
      } else if (currentIssues.has(fix.issue_code)) {
        // Issue still present
        verificationResult = 'still_present'
        results.stillPresent++
      } else {
        // Issue resolved
        verificationResult = 'resolved'
        results.verified++
      }

      // Update fix history with verification result
      const { error: updateError } = await supabase
        .from('gmc_fix_history')
        .update({
          verified_at: new Date().toISOString(),
          verification_result: verificationResult,
          verification_details: {
            checked_at: new Date().toISOString(),
            issues_found: currentIssues ? Array.from(currentIssues) : []
          }
        })
        .eq('id', fix.id)

      if (updateError) {
        results.errors.push({
          offerId: fix.offer_id,
          error: updateError.message
        })
      }
    }

    // Update resolution status if all fixes for an issue are verified
    if (issueCode) {
      const pendingFixes = await supabase
        .from('gmc_fix_history')
        .select('id')
        .eq('account_id', account.id)
        .eq('issue_code', issueCode)
        .is('verified_at', null)

      if (!pendingFixes.data || pendingFixes.data.length === 0) {
        // All fixes verified - update resolution status
        const allResolved = results.stillPresent === 0

        await supabase
          .from('gmc_issue_resolution')
          .upsert({
            account_id: account.id,
            issue_code: issueCode,
            status: allResolved ? 'verified' : 'in_progress',
            products_fixed: results.verified,
            products_failed: results.stillPresent,
            verified_at: allResolved ? new Date().toISOString() : null
          }, {
            onConflict: 'account_id,issue_code'
          })
      }
    }

    return NextResponse.json({
      success: true,
      verified: results.verified,
      stillPresent: results.stillPresent,
      total: fixHistory.length,
      errors: results.errors.length > 0 ? results.errors : undefined
    })

  } catch (error: any) {
    console.error('GMC verify API error:', error)
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}

// GET - Get verification status for fixes
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'
  const issueCode = searchParams.get('issueCode')

  try {
    const supabase = createServerClient()

    // Get account for this business
    const { data: account, error: accountError } = await supabase
      .from('google_ads_accounts')
      .select('id')
      .eq('business', business)
      .single()

    if (accountError || !account) {
      return NextResponse.json({
        hasData: false,
        message: 'Account not found'
      })
    }

    // Get fix history with verification status
    let query = supabase
      .from('gmc_fix_history')
      .select('*')
      .eq('account_id', account.id)
      .order('executed_at', { ascending: false })

    if (issueCode) {
      query = query.eq('issue_code', issueCode)
    }

    const { data: history, error } = await query.limit(100)

    if (error) throw error

    // Calculate summary
    const summary = {
      total: history?.length || 0,
      verified: history?.filter(h => h.verification_result === 'resolved').length || 0,
      stillPresent: history?.filter(h => h.verification_result === 'still_present').length || 0,
      pending: history?.filter(h => !h.verified_at).length || 0
    }

    return NextResponse.json({
      hasData: true,
      business,
      summary,
      history: history || []
    })

  } catch (error: any) {
    console.error('GMC verify status API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get verification status' },
      { status: 500 }
    )
  }
}
