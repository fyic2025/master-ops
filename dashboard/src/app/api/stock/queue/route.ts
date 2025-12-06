import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// BOO Supabase - must be set in environment
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_KEY

if (!SUPABASE_KEY) {
  console.error('BOO_SUPABASE_SERVICE_KEY environment variable is required')
}

type QueueAction = 'disable' | 'discontinue' | 'update_inventory'

interface QueueRequest {
  action: QueueAction
  productIds: number[]
  priority?: number
  params?: {
    inventory_level?: number
  }
}

interface DispatchProduct {
  id: number
  product_id: number
  bc_product_id?: number
  sku: string
  product_name: string
}

// POST: Queue fix actions to Supabase
export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing BOO_SUPABASE_SERVICE_KEY' },
        { status: 500 }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const body: QueueRequest = await request.json()
    const { action, productIds, priority = 5, params } = body

    if (!action || !productIds?.length) {
      return NextResponse.json(
        { error: 'action and productIds are required' },
        { status: 400 }
      )
    }

    // Validate action
    const validActions: QueueAction[] = ['disable', 'discontinue', 'update_inventory']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch product details for queue items
    const { data: products, error: fetchError } = await supabase
      .from('dispatch_problem_products')
      .select('id, product_id, sku, product_name')
      .in('id', productIds)

    if (fetchError) {
      console.error('Error fetching products:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!products?.length) {
      return NextResponse.json({ error: 'No products found with provided IDs' }, { status: 404 })
    }

    // Create queue items
    const queueItems = products.map((product: DispatchProduct) => ({
      product_id: product.id,
      bc_product_id: product.product_id,
      sku: product.sku,
      product_name: product.product_name,
      action,
      params: params || null,
      status: 'pending',
      priority,
      initiated_by: 'dashboard',
      source_page: '/boo/stock',
    }))

    const { data: queuedItems, error: insertError } = await supabase
      .from('stock_fix_queue')
      .insert(queueItems)
      .select('id')

    if (insertError) {
      console.error('Error queuing items:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Update dispatch_problem_products with queue status
    const queueIds = queuedItems?.map(q => q.id) || []

    for (let i = 0; i < products.length; i++) {
      await supabase
        .from('dispatch_problem_products')
        .update({
          fix_status: 'queued',
          fix_queue_id: queueIds[i] || null,
        })
        .eq('id', products[i].id)
    }

    return NextResponse.json({
      success: true,
      queued: queueItems.length,
      queueIds,
      estimatedProcessingTime: '~15 minutes',
    })
  } catch (err: any) {
    console.error('Stock queue API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: Get queue status
export async function GET() {
  try {
    if (!SUPABASE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing BOO_SUPABASE_SERVICE_KEY' },
        { status: 500 }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    // Get pending count and oldest
    const { data: pending, error: pendingError } = await supabase
      .from('stock_fix_queue')
      .select('id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (pendingError) {
      console.error('Error fetching pending:', pendingError)
    }

    // Get processing count
    const { count: processingCount } = await supabase
      .from('stock_fix_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing')

    // Get recent completed (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentCompleted, error: completedError } = await supabase
      .from('stock_fix_queue')
      .select('id, product_name, action, status, completed_at')
      .in('status', ['completed', 'failed'])
      .gte('completed_at', oneDayAgo)
      .order('completed_at', { ascending: false })
      .limit(20)

    if (completedError) {
      console.error('Error fetching completed:', completedError)
    }

    return NextResponse.json({
      pending: {
        count: pending?.length || 0,
        oldest: pending?.[0]?.created_at || null,
      },
      processing: {
        count: processingCount || 0,
      },
      recentCompleted: (recentCompleted || []).map(item => ({
        id: item.id,
        product_name: item.product_name,
        action: item.action,
        result: item.status === 'completed' ? 'success' : 'failed',
        completed_at: item.completed_at,
      })),
    })
  } catch (err: any) {
    console.error('Stock queue status error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
