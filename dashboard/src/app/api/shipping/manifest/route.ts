import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// AusPost API credentials by business
const AUSPOST_CONFIG: Record<string, { accountNumber: string }> = {
  boo: { accountNumber: process.env.BOO_AUSPOST_ACCOUNT_NUMBER || '' },
  teelixir: { accountNumber: process.env.TEELIXIR_AUSPOST_ACCOUNT_NUMBER || '' },
  elevate: { accountNumber: process.env.ELEVATE_AUSPOST_ACCOUNT_NUMBER || '' },
}

const AUSPOST_API_KEY = process.env.AUSPOST_API_KEY || ''
const AUSPOST_API_SECRET = process.env.AUSPOST_API_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { business, carrier = 'auspost' } = body

    if (!business || business === 'all') {
      return NextResponse.json(
        { error: 'Business code is required' },
        { status: 400 }
      )
    }

    // Get all printed orders for this business that haven't been manifested
    const { data: orders, error: fetchError } = await supabase
      .from('shipping_orders')
      .select('*')
      .eq('business_code', business)
      .eq('carrier', carrier)
      .eq('status', 'printed')
      .is('manifest_id', null)

    if (fetchError) throw fetchError

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: 'No printed orders to manifest' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // Create manifest record
    const { data: manifest, error: manifestError } = await supabase
      .from('shipping_manifests')
      .insert({
        business_code: business,
        carrier,
        manifest_date: today,
        shipment_count: orders.length,
        status: 'open',
      })
      .select()
      .single()

    if (manifestError) {
      // If manifest already exists for today, get it
      if (manifestError.code === '23505') {
        const { data: existingManifest } = await supabase
          .from('shipping_manifests')
          .select()
          .eq('business_code', business)
          .eq('carrier', carrier)
          .eq('manifest_date', today)
          .single()

        if (existingManifest) {
          // Update the existing manifest
          await supabase
            .from('shipping_manifests')
            .update({
              shipment_count: existingManifest.shipment_count + orders.length,
            })
            .eq('id', existingManifest.id)

          // Link orders to manifest
          await supabase
            .from('shipping_orders')
            .update({
              manifest_id: existingManifest.id,
              status: 'shipped',
              shipped_at: new Date().toISOString(),
            })
            .in('id', orders.map(o => o.id))

          return NextResponse.json({
            success: true,
            manifest_id: existingManifest.id,
            orders_manifested: orders.length,
            message: `Added ${orders.length} orders to existing manifest`,
          })
        }
      }
      throw manifestError
    }

    // Link orders to manifest and update status
    const { error: updateError } = await supabase
      .from('shipping_orders')
      .update({
        manifest_id: manifest.id,
        status: 'shipped',
        shipped_at: new Date().toISOString(),
      })
      .in('id', orders.map(o => o.id))

    if (updateError) throw updateError

    // If AusPost, call their manifest API
    if (carrier === 'auspost' && AUSPOST_API_KEY && AUSPOST_API_SECRET) {
      const config = AUSPOST_CONFIG[business]
      if (config?.accountNumber) {
        try {
          // Get tracking numbers for manifest
          const trackingNumbers = orders
            .map(o => o.tracking_number)
            .filter(Boolean)

          if (trackingNumbers.length > 0) {
            const auth = Buffer.from(`${AUSPOST_API_KEY}:${AUSPOST_API_SECRET}`).toString('base64')

            const manifestRes = await fetch(
              'https://digitalapi.auspost.com.au/shipping/v1/manifest',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${auth}`,
                  'Content-Type': 'application/json',
                  'Account-Number': config.accountNumber,
                },
                body: JSON.stringify({
                  shipments: trackingNumbers.map(tn => ({ shipment_id: tn })),
                }),
              }
            )

            if (manifestRes.ok) {
              const manifestData = await manifestRes.json()

              // Update manifest with AusPost data
              await supabase
                .from('shipping_manifests')
                .update({
                  manifest_number: manifestData.manifest_id,
                  manifest_data: manifestData,
                  status: 'closed',
                  closed_at: new Date().toISOString(),
                })
                .eq('id', manifest.id)

              return NextResponse.json({
                success: true,
                manifest_id: manifest.id,
                manifest_number: manifestData.manifest_id,
                orders_manifested: orders.length,
                pdf_url: manifestData.manifest_pdf_url,
              })
            }
          }
        } catch (auspostError) {
          console.error('AusPost manifest API error:', auspostError)
          // Continue without AusPost confirmation
        }
      }
    }

    // Close manifest locally even if AusPost API failed
    await supabase
      .from('shipping_manifests')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', manifest.id)

    return NextResponse.json({
      success: true,
      manifest_id: manifest.id,
      orders_manifested: orders.length,
      message: `Created manifest with ${orders.length} orders`,
    })
  } catch (error: any) {
    console.error('Manifest error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create manifest' },
      { status: 500 }
    )
  }
}

// GET - List manifests
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business')

  try {
    let query = supabase
      .from('shipping_manifests')
      .select('*')
      .order('manifest_date', { ascending: false })
      .limit(50)

    if (business && business !== 'home') {
      query = query.eq('business_code', business)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ manifests: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
