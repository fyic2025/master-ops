import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface CarrierService {
  code: string
  name: string
  type: 'domestic' | 'international'
  isDefault: boolean
}

interface CarrierConfig {
  code: string
  name: string
  services: CarrierService[]
}

const CARRIER_NAMES: Record<string, string> = {
  auspost: 'Australia Post',
  sendle: 'Sendle'
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business')

  if (!business || business === 'home') {
    return NextResponse.json(
      { error: 'Business code is required' },
      { status: 400 }
    )
  }

  try {
    // Get carrier configurations from database
    const { data: configs, error } = await supabase
      .from('carrier_configurations')
      .select('*')
      .eq('business_code', business)
      .eq('is_active', true)

    if (error) throw error

    // Transform to API response format
    const carriers: CarrierConfig[] = (configs || []).map(config => {
      const services: CarrierService[] = (config.services as any[]).map(svc => ({
        code: svc.code,
        name: svc.name,
        type: svc.type as 'domestic' | 'international',
        isDefault: svc.is_default || false
      }))

      return {
        code: config.carrier,
        name: CARRIER_NAMES[config.carrier] || config.carrier,
        services
      }
    })

    return NextResponse.json({ carriers })
  } catch (error: any) {
    console.error('Carriers API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch carriers' },
      { status: 500 }
    )
  }
}
