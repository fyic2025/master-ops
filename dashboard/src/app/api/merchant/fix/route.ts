import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateSingleIssuePrompt, generateBatchFixPrompt, GMCIssue, GMCProduct } from '@/lib/merchant/prompt-generator'

interface FixRequest {
  action: 'queue' | 'execute' | 'generate-prompt' | 'start'
  business?: string
  issueCode?: string
  offerIds?: string[]
  fixType?: 'auto' | 'semi-auto' | 'manual' | 'claude'
  dryRun?: boolean
  batchSize?: number
}

// Map issue codes to fixability
const ISSUE_FIXABILITY: Record<string, 'auto' | 'semi-auto' | 'manual'> = {
  // Auto-fixable (can sync/resync)
  'price_mismatch': 'auto',
  'incorrect_price': 'auto',
  'sale_price_mismatch': 'auto',
  'out_of_stock': 'auto',
  'availability_mismatch': 'auto',
  'missing_availability': 'auto',
  'missing_condition': 'auto',

  // Semi-auto (need data lookup)
  'missing_gtin': 'semi-auto',
  'invalid_gtin': 'semi-auto',
  'gtin_mismatch': 'semi-auto',
  'missing_description': 'semi-auto',
  'description_too_short': 'semi-auto',
  'missing_brand': 'semi-auto',
  'title_too_long': 'semi-auto',
  'shipping_weight_missing': 'semi-auto',

  // Manual review required
  'image_too_small': 'manual',
  'image_overlay': 'manual',
  'image_watermark': 'manual',
  'image_generic': 'manual',
  'missing_image_link': 'manual',
  'image_link_broken': 'manual',
  'product_policy_violation': 'manual',
  'adult_content': 'manual',
  'prohibited_product': 'manual',
  'counterfeit_goods': 'manual',
  'brand_gtin_mismatch': 'manual',
  'landing_page_error': 'manual',
}

// GET - Get fix queue status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'boo'
  const batchId = searchParams.get('batchId')
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

    // Build query
    let query = supabase
      .from('gmc_fix_queue')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })

    if (batchId) {
      query = query.eq('batch_id', batchId)
    }

    if (issueCode) {
      query = query.eq('issue_code', issueCode)
    }

    const { data: fixes, error } = await query.limit(100)

    if (error) throw error

    // Calculate summary
    const summary = {
      total: fixes?.length || 0,
      pending: fixes?.filter(f => f.status === 'pending').length || 0,
      executing: fixes?.filter(f => f.status === 'executing').length || 0,
      completed: fixes?.filter(f => f.status === 'completed').length || 0,
      failed: fixes?.filter(f => f.status === 'failed').length || 0,
      skipped: fixes?.filter(f => f.status === 'skipped').length || 0,
    }

    return NextResponse.json({
      hasData: true,
      business,
      summary,
      fixes: fixes || []
    })

  } catch (error: any) {
    console.error('GMC fix status API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get fix status' },
      { status: 500 }
    )
  }
}

// POST - Queue fixes or generate prompt
export async function POST(request: NextRequest) {
  try {
    const body: FixRequest = await request.json()
    const {
      action,
      business = 'boo',
      issueCode,
      offerIds,
      fixType,
      dryRun = false,
      batchSize = 50
    } = body

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

    // Handle different actions
    switch (action) {
      case 'generate-prompt':
        return handleGeneratePrompt(supabase, account.id, business, issueCode, offerIds)

      case 'start':
        return handleStartFix(supabase, account.id, business, issueCode, offerIds)

      case 'queue':
        return handleQueueFixes(supabase, account.id, business, issueCode, offerIds, fixType, batchSize, dryRun)

      case 'execute':
        return handleExecuteFixes(supabase, account.id, business, issueCode, offerIds, dryRun)

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: generate-prompt, start, queue, or execute' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('GMC fix API error:', error)
    return NextResponse.json(
      { error: error.message || 'Fix operation failed' },
      { status: 500 }
    )
  }
}

// Generate Claude prompt for fixing issues
async function handleGeneratePrompt(
  supabase: ReturnType<typeof createServerClient>,
  accountId: string,
  business: string,
  issueCode?: string,
  offerIds?: string[]
) {
  // Get products with the issue
  let productsQuery = supabase
    .from('google_merchant_products')
    .select('product_id, offer_id, title, approval_status, item_issues, impressions_30d, clicks_30d')
    .eq('account_id', accountId)
    .not('item_issues', 'is', null)

  if (offerIds && offerIds.length > 0) {
    productsQuery = productsQuery.in('offer_id', offerIds)
  }

  const { data: rawProducts, error: productsError } = await productsQuery

  if (productsError) throw productsError

  // Filter products by issue code if specified
  const products: GMCProduct[] = []
  const issueMap = new Map<string, GMCIssue>()

  for (const product of rawProducts || []) {
    if (!product.item_issues || !Array.isArray(product.item_issues)) continue

    for (const issue of product.item_issues) {
      const code = issue.code || 'unknown'

      // Skip if filtering by issue code and doesn't match
      if (issueCode && code !== issueCode) continue

      // Add product to list
      products.push({
        product_id: product.product_id,
        offer_id: product.offer_id || '',
        title: product.title || '',
        approval_status: product.approval_status || 'pending',
        impressions_30d: product.impressions_30d || 0,
        clicks_30d: product.clicks_30d || 0,
      })

      // Track issue
      if (!issueMap.has(code)) {
        issueMap.set(code, {
          issue_code: code,
          severity: issue.severity || 'warning',
          description: issue.description || issue.detail || '',
          resolution: issue.resolution || null,
          product_count: 0,
          total_impressions: 0,
          total_clicks: 0,
          fixability: ISSUE_FIXABILITY[code] || 'unknown',
          status: 'pending'
        })
      }

      const issueData = issueMap.get(code)!
      issueData.product_count++
      issueData.total_impressions += product.impressions_30d || 0
      issueData.total_clicks += product.clicks_30d || 0
    }
  }

  // Generate prompt
  if (issueCode && issueMap.has(issueCode)) {
    const issue = issueMap.get(issueCode)!
    const prompt = generateSingleIssuePrompt(issue, products)

    return NextResponse.json({
      success: true,
      prompt,
      issue,
      productCount: products.length
    })
  }

  // Batch prompt for multiple issues
  const issues = Array.from(issueMap.values())
  const productsByIssue = new Map<string, GMCProduct[]>()

  for (const issue of issues) {
    productsByIssue.set(issue.issue_code, products.filter(p => {
      const rawProduct = rawProducts?.find(rp => rp.offer_id === p.offer_id)
      return rawProduct?.item_issues?.some((i: any) => i.code === issue.issue_code)
    }))
  }

  const prompt = generateBatchFixPrompt(issues, productsByIssue)

  return NextResponse.json({
    success: true,
    prompt,
    issues,
    totalProducts: products.length
  })
}

// Mark issues as in_progress when starting fix
async function handleStartFix(
  supabase: ReturnType<typeof createServerClient>,
  accountId: string,
  business: string,
  issueCode?: string,
  offerIds?: string[]
) {
  if (!issueCode) {
    return NextResponse.json(
      { error: 'issueCode is required for start action' },
      { status: 400 }
    )
  }

  // Update resolution status to in_progress
  const { error: resolutionError } = await supabase
    .from('gmc_issue_resolution')
    .upsert({
      account_id: accountId,
      issue_code: issueCode,
      status: 'in_progress',
      fix_type: 'claude',
      last_fix_attempt_at: new Date().toISOString(),
    }, {
      onConflict: 'account_id,issue_code'
    })

  if (resolutionError) {
    console.error('Failed to update resolution status:', resolutionError)
  }

  return NextResponse.json({
    success: true,
    message: `Issue ${issueCode} marked as in_progress`,
    issueCode
  })
}

// Queue fixes for later execution
async function handleQueueFixes(
  supabase: ReturnType<typeof createServerClient>,
  accountId: string,
  business: string,
  issueCode?: string,
  offerIds?: string[],
  fixType?: string,
  batchSize: number = 50,
  dryRun: boolean = false
) {
  // Get products with the issue
  let productsQuery = supabase
    .from('google_merchant_products')
    .select('product_id, offer_id, title, approval_status, item_issues')
    .eq('account_id', accountId)
    .not('item_issues', 'is', null)

  if (offerIds && offerIds.length > 0) {
    productsQuery = productsQuery.in('offer_id', offerIds)
  }

  const { data: products, error: productsError } = await productsQuery

  if (productsError) throw productsError

  // Filter products by issue code
  const fixesToQueue: any[] = []
  const batchId = crypto.randomUUID()

  for (const product of products || []) {
    if (!product.item_issues || !Array.isArray(product.item_issues)) continue

    for (const issue of product.item_issues) {
      const code = issue.code || 'unknown'

      // Skip if filtering by issue code and doesn't match
      if (issueCode && code !== issueCode) continue

      const determinedFixType = fixType || ISSUE_FIXABILITY[code] || 'unknown'

      fixesToQueue.push({
        account_id: accountId,
        issue_code: code,
        offer_id: product.offer_id,
        fix_type: determinedFixType,
        fix_action: {
          issue_description: issue.description,
          issue_severity: issue.severity,
          product_title: product.title,
        },
        status: 'pending',
        batch_id: batchId,
        created_by: 'dashboard'
      })

      // Limit batch size
      if (fixesToQueue.length >= batchSize) break
    }

    if (fixesToQueue.length >= batchSize) break
  }

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      wouldQueue: fixesToQueue.length,
      batchId,
      sample: fixesToQueue.slice(0, 5)
    })
  }

  // Insert into queue
  const { data: queued, error: queueError } = await supabase
    .from('gmc_fix_queue')
    .upsert(fixesToQueue, {
      onConflict: 'account_id,offer_id,issue_code',
      ignoreDuplicates: false
    })
    .select()

  if (queueError) throw queueError

  return NextResponse.json({
    success: true,
    queuedCount: fixesToQueue.length,
    batchId,
    message: `Queued ${fixesToQueue.length} fixes`
  })
}

// Execute auto-fixable issues
async function handleExecuteFixes(
  supabase: ReturnType<typeof createServerClient>,
  accountId: string,
  business: string,
  issueCode?: string,
  offerIds?: string[],
  dryRun: boolean = false
) {
  // For now, return a message that auto-execution requires BC API setup
  // This can be expanded once BC credentials are available

  return NextResponse.json({
    success: false,
    message: 'Auto-execution of fixes requires BigCommerce API integration. Use generate-prompt action for Claude Code fixes.',
    suggestion: 'Use action: "generate-prompt" to get a Claude Code prompt for manual fixing'
  })

  // TODO: Implement actual BC API integration when ready
  // This would:
  // 1. Look up BC product_id from offer_id (SKU)
  // 2. Determine fix action based on issue type
  // 3. Call BC API to update product
  // 4. Record result in gmc_fix_history
}
