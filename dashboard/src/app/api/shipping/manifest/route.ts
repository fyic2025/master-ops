import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'home'

  try {
    let query = supabase
      .from('shipping_manifests')
      .select('*')
      .order('created_at', { ascending: false })

    if (business !== 'home') {
      query = query.eq('business_code', business)
    } else {
      query = query.in('business_code', ['boo', 'teelixir', 'elevate'])
    }

    const { data: manifests, error } = await query.limit(50)
    if (error) throw error

    return NextResponse.json({ manifests: manifests || [] })
  } catch (error: any) {
    console.error('Manifest GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()

  try {
    const body = await request.json()
    const { order_ids, carrier, business_code } = body

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json({ error: 'No orders selected' }, { status: 400 })
    }

    // Create manifest record
    const manifestNumber = `MAN-${Date.now()}`
    const { data: manifest, error: manifestError } = await supabase
      .from('shipping_manifests')
      .insert({
        manifest_number: manifestNumber,
        business_code: business_code || 'boo',
        carrier: carrier || 'auspost',
        order_count: order_ids.length,
        status: 'created',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (manifestError) throw manifestError

    // Update orders with manifest reference
    const { error: updateError } = await supabase
      .from('shipping_orders')
      .update({
        manifest_id: manifest.id,
        status: 'manifested'
      })
      .in('id', order_ids)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      manifest_number: manifestNumber,
      manifest_id: manifest.id,
      order_count: order_ids.length
    })
  } catch (error: any) {
    console.error('Manifest POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
