import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const store = searchParams.get('store') || 'teelixir';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query for products
    let query = supabase
      .from('ul_products')
      .select('*')
      .eq('store', store)
      .eq('is_sell_item', true)
      .order('product_code');

    // Search filter
    if (search) {
      query = query.or(`product_code.ilike.%${search}%,product_description.ilike.%${search}%`);
    }

    query = query.limit(limit);

    const { data: products, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get stock levels for each product
    const productGuids = products?.map(p => p.guid) || [];

    let stockLevels: Record<string, number> = {};
    if (productGuids.length > 0) {
      const { data: stockData } = await supabase
        .from('ul_stock_on_hand')
        .select('product_guid, qty_on_hand, available_qty')
        .eq('store', store)
        .in('product_guid', productGuids);

      stockData?.forEach(s => {
        stockLevels[s.product_guid] = s.available_qty || s.qty_on_hand || 0;
      });
    }

    // Enhance products with stock info
    const enhancedProducts = products?.map(p => ({
      guid: p.guid,
      product_code: p.product_code,
      product_description: p.product_description,
      default_sell_price: p.default_sell_price || 0,
      available_qty: stockLevels[p.guid] || 0,
      unit_of_measure: p.unit_of_measure,
      product_group: p.product_group,
      is_component: p.is_component,
      raw_data: p.raw_data,
    })) || [];

    return NextResponse.json({
      products: enhancedProducts,
      count: enhancedProducts.length,
    });
  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
