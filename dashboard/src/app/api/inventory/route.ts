import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

// Lazy initialization
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface InventorySummary {
  total_products: number;
  total_variants: number;
  total_units: number;
  total_value: number;
  out_of_stock_count: number;
  low_stock_count: number;
  reorder_needed_count: number;
}

export interface InventoryProduct {
  id: string;
  shopify_product_id: number;
  product_title: string;
  vendor: string;
  product_type: string;
  variant_count: number;
  total_inventory: number;
  inventory_value: number;
  min_variant_inventory: number;
  low_stock_variants: number;
  featured_image_url: string | null;
  last_synced_at: string | null;
}

export interface InventoryVariant {
  id: string;
  sku: string;
  product_title: string;
  variant_title: string;
  price: number;
  cost: number;
  total_inventory: number;
  low_stock_threshold: number;
  reorder_point: number;
  stock_status: 'out_of_stock' | 'low_stock' | 'reorder' | 'in_stock';
}

export interface LowStockAlert {
  variant_id: string;
  sku: string;
  product_title: string;
  variant_title: string;
  total_inventory: number;
  low_stock_threshold: number;
  reorder_point: number;
  reorder_quantity: number;
  inventory_value: number;
  alert_level: 'out_of_stock' | 'critical' | 'low' | 'ok';
}

export interface RecentAdjustment {
  id: string;
  adjustment_type: string;
  quantity_change: number;
  reason: string;
  adjusted_by: string;
  adjusted_at: string;
  sku?: string;
  product_title?: string;
}

export interface InventoryData {
  summary: InventorySummary;
  products: InventoryProduct[];
  variants: InventoryVariant[];
  lowStockAlerts: LowStockAlert[];
  recentAdjustments: RecentAdjustment[];
  lastSynced: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const store = searchParams.get('store') || 'teelixir';
    const view = searchParams.get('view') || 'overview'; // overview, products, variants, alerts, adjustments

    // Get daily summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('v_inv_daily_summary')
      .select('*')
      .eq('store', store)
      .single();

    if (summaryError && summaryError.code !== 'PGRST116') {
      console.error('Error fetching summary:', summaryError);
    }

    const summary: InventorySummary = summaryData || {
      total_products: 0,
      total_variants: 0,
      total_units: 0,
      total_value: 0,
      out_of_stock_count: 0,
      low_stock_count: 0,
      reorder_needed_count: 0,
    };

    // Build response based on view
    let products: InventoryProduct[] = [];
    let variants: InventoryVariant[] = [];
    let lowStockAlerts: LowStockAlert[] = [];
    let recentAdjustments: RecentAdjustment[] = [];

    if (view === 'overview' || view === 'products') {
      // Get products with inventory overview
      const { data: productsData, error: productsError } = await supabase
        .from('v_inv_product_inventory')
        .select('*')
        .eq('store', store)
        .order('total_inventory', { ascending: true })
        .limit(view === 'overview' ? 20 : 100);

      if (productsError) {
        console.error('Error fetching products:', productsError);
      }
      products = productsData || [];
    }

    if (view === 'overview' || view === 'variants') {
      // Get variants with levels
      const { data: variantsData, error: variantsError } = await supabase
        .from('v_inv_variant_levels')
        .select('*')
        .eq('store', store)
        .order('quantity_available', { ascending: true })
        .limit(view === 'overview' ? 20 : 200);

      if (variantsError) {
        console.error('Error fetching variants:', variantsError);
      }
      variants = (variantsData || []).map(v => ({
        id: v.variant_id,
        sku: v.sku,
        product_title: v.product_title,
        variant_title: v.variant_title,
        price: v.price,
        cost: v.cost,
        total_inventory: v.quantity_available || 0,
        low_stock_threshold: v.low_stock_threshold,
        reorder_point: v.reorder_point,
        stock_status: v.stock_status,
      }));
    }

    if (view === 'overview' || view === 'alerts') {
      // Get low stock alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('v_inv_low_stock_alerts')
        .select('*')
        .eq('store', store)
        .order('total_inventory', { ascending: true })
        .limit(view === 'overview' ? 10 : 50);

      if (alertsError) {
        console.error('Error fetching alerts:', alertsError);
      }
      lowStockAlerts = alertsData || [];
    }

    if (view === 'overview' || view === 'adjustments') {
      // Get recent adjustments
      const { data: adjustmentsData, error: adjustmentsError } = await supabase
        .from('inv_adjustments')
        .select(`
          id,
          adjustment_type,
          quantity_change,
          reason,
          adjusted_by,
          adjusted_at,
          variant:variant_id (
            sku,
            product:product_id (
              product_title
            )
          )
        `)
        .eq('store', store)
        .order('adjusted_at', { ascending: false })
        .limit(view === 'overview' ? 10 : 50);

      if (adjustmentsError) {
        console.error('Error fetching adjustments:', adjustmentsError);
      }
      recentAdjustments = (adjustmentsData || []).map((a: any) => ({
        id: a.id,
        adjustment_type: a.adjustment_type,
        quantity_change: a.quantity_change,
        reason: a.reason,
        adjusted_by: a.adjusted_by,
        adjusted_at: a.adjusted_at,
        sku: a.variant?.sku,
        product_title: a.variant?.product?.product_title,
      }));
    }

    // Get last sync time
    const { data: syncData } = await supabase
      .from('inv_sync_log')
      .select('completed_at')
      .eq('store', store)
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    const response: InventoryData = {
      summary,
      products,
      variants,
      lowStockAlerts,
      recentAdjustments,
      lastSynced: syncData?.completed_at || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in inventory API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory data' },
      { status: 500 }
    );
  }
}

// POST handler for creating adjustments
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { action, store, ...data } = body;

    if (action === 'create_adjustment') {
      const { variant_id, location_id, adjustment_type, quantity_change, reason, notes, adjusted_by } = data;

      // Get current quantity
      const { data: currentLevel } = await supabase
        .from('inv_levels')
        .select('quantity_on_hand')
        .eq('variant_id', variant_id)
        .eq('location_id', location_id)
        .single();

      const quantity_before = currentLevel?.quantity_on_hand || 0;
      const quantity_after = quantity_before + quantity_change;

      // Create adjustment record
      const { data: adjustment, error: adjustmentError } = await supabase
        .from('inv_adjustments')
        .insert({
          store,
          variant_id,
          location_id,
          adjustment_type,
          quantity_change,
          quantity_before,
          quantity_after,
          reason,
          notes,
          adjusted_by,
        })
        .select()
        .single();

      if (adjustmentError) {
        return NextResponse.json({ error: adjustmentError.message }, { status: 500 });
      }

      // Update inventory level
      const { error: updateError } = await supabase
        .from('inv_levels')
        .update({
          quantity_on_hand: quantity_after,
          quantity_available: quantity_after,
          sync_source: 'adjustment',
        })
        .eq('variant_id', variant_id)
        .eq('location_id', location_id);

      if (updateError) {
        console.error('Error updating level:', updateError);
      }

      // Recalculate variant totals
      await supabase.rpc('recalculate_variant_inventory', { p_variant_id: variant_id });

      // Log activity
      await supabase.from('inv_activity_log').insert({
        store,
        entity_type: 'adjustment',
        entity_id: adjustment.id,
        variant_id,
        location_id,
        action: 'create',
        old_value: String(quantity_before),
        new_value: String(quantity_after),
        source: 'manual',
        reference_type: 'adjustment',
        reference_id: adjustment.id,
        actor: adjusted_by,
      });

      return NextResponse.json({ success: true, adjustment });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error in inventory POST:', error);
    return NextResponse.json(
      { error: 'Failed to process inventory action' },
      { status: 500 }
    );
  }
}
