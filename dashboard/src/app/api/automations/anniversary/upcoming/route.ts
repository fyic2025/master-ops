import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/automations/anniversary/upcoming?limit=20
// Returns upcoming anniversary candidates with their timing and upsell info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const supabase = createServerClient()

    // Fetch candidates from the view
    const { data: candidates, error } = await supabase
      .from('v_tlx_anniversary_upsell_candidates')
      .select('*')
      .order('days_since_order', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching upcoming candidates:', error)
      return NextResponse.json({ candidates: [], error: error.message }, { status: 500 })
    }

    // Enrich with upsell variant info
    const enrichedCandidates = []

    for (const candidate of candidates || []) {
      const idealSendDay = candidate.email_send_day - candidate.lead_days
      const daysUntilSend = idealSendDay - candidate.days_since_order

      // Look up original variant details
      let originalVariant = null
      if (candidate.shopify_variant_id) {
        const { data: origVar } = await supabase
          .from('tlx_shopify_variants')
          .select('product_title, price, image_url, size_grams')
          .eq('shopify_variant_id', candidate.shopify_variant_id)
          .single()
        originalVariant = origVar
      }

      // Look up upsell variant if applicable
      let upsellVariant = null
      let savingsPercent = null
      if (!candidate.is_largest_size && candidate.upsell_target_size) {
        const { data: upsellVar } = await supabase
          .from('tlx_shopify_variants')
          .select('product_title, variant_title, price, image_url, size_grams, shopify_variant_id')
          .eq('product_type', candidate.product_type)
          .eq('size_grams', candidate.upsell_target_size)
          .eq('is_available', true)
          .not('product_title', 'ilike', '%latte%')
          .not('product_title', 'ilike', '%matcha%')
          .not('product_title', 'ilike', '%gift%')
          .limit(1)
          .single()

        if (upsellVar && originalVariant) {
          upsellVariant = upsellVar
          // Calculate savings per gram
          const origPricePerGram = parseFloat(originalVariant.price) / originalVariant.size_grams
          const upsellPricePerGram = parseFloat(upsellVar.price) / upsellVar.size_grams
          savingsPercent = ((origPricePerGram - upsellPricePerGram) / origPricePerGram * 100).toFixed(0)
        }
      }

      enrichedCandidates.push({
        email: candidate.customer_email,
        firstName: candidate.customer_first_name,
        lastName: candidate.customer_last_name,
        firstOrderDate: candidate.first_order_date,
        daysSinceOrder: candidate.days_since_order,
        daysUntilSend: daysUntilSend,
        idealSendDay: idealSendDay,
        leadDays: candidate.lead_days,
        // Original product
        originalProductType: candidate.product_type,
        originalSize: candidate.product_size_grams,
        originalPrice: originalVariant?.price,
        originalTitle: originalVariant?.product_title,
        // Upsell
        isLargestSize: candidate.is_largest_size,
        upsellSize: candidate.upsell_target_size,
        upsellPrice: upsellVariant?.price,
        upsellTitle: upsellVariant?.product_title,
        upsellVariantTitle: upsellVariant?.variant_title,
        savingsPercent: savingsPercent,
        // Status
        status: daysUntilSend <= 0 ? 'ready' : daysUntilSend <= 7 ? 'upcoming' : 'future'
      })
    }

    // Sort by days until send (closest first)
    enrichedCandidates.sort((a, b) => a.daysUntilSend - b.daysUntilSend)

    return NextResponse.json({
      candidates: enrichedCandidates,
      summary: {
        total: enrichedCandidates.length,
        ready: enrichedCandidates.filter(c => c.status === 'ready').length,
        upcoming: enrichedCandidates.filter(c => c.status === 'upcoming').length,
        withUpsell: enrichedCandidates.filter(c => !c.isLargestSize).length,
        repeatOnly: enrichedCandidates.filter(c => c.isLargestSize).length
      }
    })
  } catch (error: any) {
    console.error('Upcoming candidates error:', error)
    return NextResponse.json({ candidates: [], error: error.message }, { status: 500 })
  }
}
