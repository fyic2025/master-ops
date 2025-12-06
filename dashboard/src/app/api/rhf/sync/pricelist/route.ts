import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Trigger pricelist sync - called by n8n on schedule
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify auth header for n8n calls
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.N8N_WEBHOOK_SECRET || 'rhf-sync-2024'

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get sync parameters
    const body = await request.json().catch(() => ({}))
    const daysBack = body.days || 7
    const supplier = body.supplier || 'all'

    // Log sync start
    await getSupabase().from('integration_logs').insert({
      source: 'rhf',
      service: 'pricelist_sync',
      operation: 'sync_start',
      level: 'info',
      status: 'pending',
      message: `Starting pricelist sync (${daysBack} days, supplier: ${supplier})`,
      details_json: { days: daysBack, supplier, triggered_by: 'n8n' }
    })

    // The actual sync is done by the script - this endpoint is for n8n to trigger
    // For now, return instructions to run script manually or deploy script runner

    // Check latest pricelists to confirm data freshness
    const { data: latestPricelists, error: fetchError } = await supabase
      .from('rhf_pricelists')
      .select('id, supplier_id, effective_date, item_count, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (fetchError) {
      throw new Error(`Failed to fetch pricelists: ${fetchError.message}`)
    }

    // Get supplier names
    const { data: suppliers } = await supabase
      .from('rhf_suppliers')
      .select('id, name')

    const supplierMap = new Map(suppliers?.map(s => [s.id, s.name]) || [])

    const enrichedPricelists = latestPricelists?.map(p => ({
      ...p,
      supplier_name: supplierMap.get(p.supplier_id) || 'Unknown'
    }))

    const elapsed = Date.now() - startTime

    // Log success
    await getSupabase().from('integration_logs').insert({
      source: 'rhf',
      service: 'pricelist_sync',
      operation: 'sync_check',
      level: 'info',
      status: 'success',
      message: `Pricelist check completed in ${elapsed}ms`,
      details_json: {
        latest_count: latestPricelists?.length,
        elapsed_ms: elapsed
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Pricelist sync check completed',
      latest_pricelists: enrichedPricelists,
      note: 'Full sync runs via gmail-pricelist-reader.ts script',
      elapsed_ms: elapsed
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log error
    await getSupabase().from('integration_logs').insert({
      source: 'rhf',
      service: 'pricelist_sync',
      operation: 'sync_error',
      level: 'error',
      status: 'failed',
      message: errorMessage,
      details_json: { error: errorMessage }
    })

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// GET - Check sync status
export async function GET() {
  try {
    // Get latest sync logs
    const { data: logs } = await supabase
      .from('integration_logs')
      .select('*')
      .eq('source', 'rhf')
      .eq('service', 'pricelist_sync')
      .order('created_at', { ascending: false })
      .limit(10)

    // Get pricelist stats
    const { data: stats } = await supabase
      .from('rhf_pricelists')
      .select('supplier_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    // Group by supplier
    const bySupplier: Record<string, { count: number; latest: string }> = {}
    stats?.forEach(p => {
      if (!bySupplier[p.supplier_id]) {
        bySupplier[p.supplier_id] = { count: 0, latest: p.created_at }
      }
      bySupplier[p.supplier_id].count++
    })

    return NextResponse.json({
      status: 'ok',
      recent_logs: logs,
      pricelist_stats: bySupplier
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
