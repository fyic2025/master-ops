import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const store = searchParams.get('store') || 'teelixir';
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all'; // all, retail, wholesale
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('ul_customers')
      .select('*', { count: 'exact' })
      .eq('store', store)
      .order('customer_name', { ascending: true });

    // Search by name, email, or code
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,email.ilike.%${search}%,customer_code.ilike.%${search}%`);
    }

    // Filter by type (based on sell_price_tier)
    if (type === 'wholesale') {
      query = query.not('sell_price_tier', 'is', null);
    } else if (type === 'retail') {
      query = query.is('sell_price_tier', null);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: customers, error, count } = await query;

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get summary stats
    const { data: allCustomers } = await supabase
      .from('ul_customers')
      .select('customer_type, sell_price_tier, obsolete')
      .eq('store', store);

    const stats = {
      total: allCustomers?.length || 0,
      active: allCustomers?.filter(c => !c.obsolete).length || 0,
      obsolete: allCustomers?.filter(c => c.obsolete).length || 0,
      wholesale: allCustomers?.filter(c => c.sell_price_tier).length || 0,
      retail: allCustomers?.filter(c => !c.sell_price_tier).length || 0,
    };

    // Get last sync info
    const { data: syncData } = await supabase
      .from('ul_sync_runs')
      .select('*')
      .eq('store', store)
      .eq('sync_type', 'customers')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      customers: customers || [],
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      lastSync: syncData?.completed_at || syncData?.started_at || null,
    });
  } catch (error) {
    console.error('Error in customers API:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
