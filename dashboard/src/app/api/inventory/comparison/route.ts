import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface StockComparison {
  product_code: string;
  product_description: string;
  unleashed_qty: number;
  shopify_qty: number | null;
  difference: number;
  unleashed_cost: number | null;
  shopify_cost: number | null;
  cost_difference: number | null;
  match_status: 'match' | 'mismatch' | 'unleashed_only' | 'shopify_only';
  severity: 'ok' | 'low' | 'medium' | 'high' | 'critical';
}

export interface SyncStatus {
  last_sync: string | null;
  sync_type: string | null;
  records_synced: number;
  status: string | null;
}

export interface AccuracyMetrics {
  date: string;
  total_skus: number;
  matched_skus: number;
  accuracy_percentage: number;
  total_quantity_difference: number;
}

export interface ComparisonData {
  summary: {
    total_unleashed_products: number;
    total_shopify_products: number;
    matched_count: number;
    mismatch_count: number;
    unleashed_only_count: number;
    shopify_only_count: number;
    accuracy_percentage: number;
    total_quantity_variance: number;
  };
  comparisons: StockComparison[];
  syncStatus: SyncStatus;
  accuracyHistory: AccuracyMetrics[];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const store = searchParams.get('store') || 'teelixir';
    const filter = searchParams.get('filter') || 'all'; // all, mismatches, unleashed_only

    // Get Unleashed stock data
    const { data: unleashedStock, error: unleashedError } = await supabase
      .from('ul_stock_on_hand')
      .select(`
        product_guid,
        product_code,
        product_description,
        qty_on_hand,
        available_qty,
        average_land_price,
        warehouse_code,
        warehouse_guid
      `)
      .eq('store', store)
      .order('product_code');

    if (unleashedError) {
      console.error('Error fetching Unleashed stock:', unleashedError);
    }

    // Get Shopify/existing inventory data
    const { data: shopifyStock, error: shopifyError } = await supabase
      .from('inv_variants')
      .select(`
        id,
        sku,
        product:product_id (
          product_title
        ),
        cost,
        total_inventory
      `)
      .eq('store', store);

    if (shopifyError) {
      console.error('Error fetching Shopify stock:', shopifyError);
    }

    // Create lookup map for Shopify inventory by SKU
    const shopifyMap = new Map<string, {
      sku: string;
      product_title: string;
      total_inventory: number;
      cost: number | null;
    }>();

    (shopifyStock || []).forEach((item: any) => {
      if (item.sku) {
        shopifyMap.set(item.sku.toLowerCase(), {
          sku: item.sku,
          product_title: item.product?.product_title || '',
          total_inventory: item.total_inventory || 0,
          cost: item.cost,
        });
      }
    });

    // Build comparison records
    const comparisons: StockComparison[] = [];
    const processedSkus = new Set<string>();

    // Process Unleashed stock
    (unleashedStock || []).forEach((ul) => {
      const sku = ul.product_code?.toLowerCase() || '';
      processedSkus.add(sku);

      const shopify = shopifyMap.get(sku);
      const unleashedQty = ul.qty_on_hand || 0;
      const shopifyQty = shopify?.total_inventory ?? null;
      const difference = shopifyQty !== null ? unleashedQty - shopifyQty : unleashedQty;

      const costDiff = (ul.average_land_price && shopify?.cost)
        ? ul.average_land_price - shopify.cost
        : null;

      let matchStatus: StockComparison['match_status'];
      if (!shopify) {
        matchStatus = 'unleashed_only';
      } else if (difference === 0) {
        matchStatus = 'match';
      } else {
        matchStatus = 'mismatch';
      }

      let severity: StockComparison['severity'] = 'ok';
      const absDiff = Math.abs(difference);
      if (matchStatus === 'match') {
        severity = 'ok';
      } else if (absDiff === 0) {
        severity = 'ok';
      } else if (absDiff <= 2) {
        severity = 'low';
      } else if (absDiff <= 5) {
        severity = 'medium';
      } else if (absDiff <= 10) {
        severity = 'high';
      } else {
        severity = 'critical';
      }

      comparisons.push({
        product_code: ul.product_code || '',
        product_description: ul.product_description || '',
        unleashed_qty: unleashedQty,
        shopify_qty: shopifyQty,
        difference,
        unleashed_cost: ul.average_land_price,
        shopify_cost: shopify?.cost || null,
        cost_difference: costDiff,
        match_status: matchStatus,
        severity,
      });
    });

    // Add Shopify-only items
    shopifyMap.forEach((shopify, sku) => {
      if (!processedSkus.has(sku)) {
        comparisons.push({
          product_code: shopify.sku,
          product_description: shopify.product_title,
          unleashed_qty: 0,
          shopify_qty: shopify.total_inventory,
          difference: -shopify.total_inventory,
          unleashed_cost: null,
          shopify_cost: shopify.cost,
          cost_difference: null,
          match_status: 'shopify_only',
          severity: shopify.total_inventory > 10 ? 'high' : 'medium',
        });
      }
    });

    // Filter results
    let filteredComparisons = comparisons;
    if (filter === 'mismatches') {
      filteredComparisons = comparisons.filter(c => c.match_status === 'mismatch');
    } else if (filter === 'unleashed_only') {
      filteredComparisons = comparisons.filter(c => c.match_status === 'unleashed_only');
    } else if (filter === 'shopify_only') {
      filteredComparisons = comparisons.filter(c => c.match_status === 'shopify_only');
    }

    // Sort by severity (critical first)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, ok: 4 };
    filteredComparisons.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Calculate summary
    const matchedCount = comparisons.filter(c => c.match_status === 'match').length;
    const mismatchCount = comparisons.filter(c => c.match_status === 'mismatch').length;
    const unleashedOnlyCount = comparisons.filter(c => c.match_status === 'unleashed_only').length;
    const shopifyOnlyCount = comparisons.filter(c => c.match_status === 'shopify_only').length;
    const totalComparable = matchedCount + mismatchCount;
    const accuracyPercentage = totalComparable > 0
      ? Math.round((matchedCount / totalComparable) * 100 * 10) / 10
      : 0;
    const totalQuantityVariance = comparisons.reduce((sum, c) => sum + Math.abs(c.difference), 0);

    // Get last sync info
    const { data: syncData } = await supabase
      .from('ul_sync_runs')
      .select('*')
      .eq('store', store)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    const syncStatus: SyncStatus = {
      last_sync: syncData?.completed_at || syncData?.started_at || null,
      sync_type: syncData?.sync_type || null,
      records_synced: syncData?.records_synced || 0,
      status: syncData?.status || null,
    };

    // Get accuracy history (last 30 days)
    const { data: accuracyData } = await supabase
      .from('ul_accuracy_metrics')
      .select('*')
      .eq('store', store)
      .order('measured_at', { ascending: false })
      .limit(30);

    const accuracyHistory: AccuracyMetrics[] = (accuracyData || []).map((a: any) => ({
      date: a.measured_at,
      total_skus: a.total_skus || 0,
      matched_skus: a.matched_skus || 0,
      accuracy_percentage: a.accuracy_percentage || 0,
      total_quantity_difference: a.total_qty_variance || 0,
    }));

    const response: ComparisonData = {
      summary: {
        total_unleashed_products: unleashedStock?.length || 0,
        total_shopify_products: shopifyStock?.length || 0,
        matched_count: matchedCount,
        mismatch_count: mismatchCount,
        unleashed_only_count: unleashedOnlyCount,
        shopify_only_count: shopifyOnlyCount,
        accuracy_percentage: accuracyPercentage,
        total_quantity_variance: totalQuantityVariance,
      },
      comparisons: filteredComparisons,
      syncStatus,
      accuracyHistory,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in comparison API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comparison data' },
      { status: 500 }
    );
  }
}

// POST to record accuracy metrics
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { store } = body;

    // Get current comparison data
    const response = await GET(request);
    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    // Record accuracy metrics
    const { error: insertError } = await supabase
      .from('ul_accuracy_metrics')
      .insert({
        store,
        measured_at: new Date().toISOString(),
        total_skus: data.summary.total_unleashed_products,
        matched_skus: data.summary.matched_count,
        mismatched_skus: data.summary.mismatch_count,
        accuracy_percentage: data.summary.accuracy_percentage,
        total_qty_variance: data.summary.total_quantity_variance,
      });

    if (insertError) {
      console.error('Error recording metrics:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in comparison POST:', error);
    return NextResponse.json(
      { error: 'Failed to record metrics' },
      { status: 500 }
    );
  }
}
