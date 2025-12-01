import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const AUSPOST_API_URL = 'https://digitalapi.auspost.com.au'

interface AddressValidationRequest {
  address1: string
  address2?: string
  city: string
  state: string
  postcode: string
  country: string
}

interface AddressValidationResponse {
  isValid: boolean
  isDeliverable: boolean
  normalizedAddress?: {
    address1: string
    address2?: string
    city: string
    state: string
    postcode: string
  }
  suggestions?: Array<{
    address1: string
    city: string
    state: string
    postcode: string
  }>
  errors?: string[]
  warnings?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: AddressValidationRequest = await request.json()
    const { address1, address2, city, state, postcode, country } = body

    // Basic validation
    if (!address1 || !city || !state || !postcode) {
      return NextResponse.json({
        isValid: false,
        isDeliverable: false,
        errors: ['Address, city, state and postcode are required']
      })
    }

    // For international addresses, just do basic validation
    if (country && country !== 'AU') {
      // Basic checks for international
      const errors: string[] = []

      if (address1.length < 5) {
        errors.push('Address line 1 is too short')
      }
      if (city.length < 2) {
        errors.push('City name is too short')
      }
      if (postcode.length < 3) {
        errors.push('Postcode is too short')
      }

      return NextResponse.json({
        isValid: errors.length === 0,
        isDeliverable: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: ['International address validation is limited']
      } as AddressValidationResponse)
    }

    // Australian address validation
    const errors: string[] = []
    const warnings: string[] = []

    // Validate postcode format (4 digits)
    if (!/^\d{4}$/.test(postcode)) {
      errors.push('Australian postcode must be 4 digits')
    }

    // Map full state names to codes
    const stateNameToCode: Record<string, string> = {
      'NEW SOUTH WALES': 'NSW',
      'VICTORIA': 'VIC',
      'QUEENSLAND': 'QLD',
      'WESTERN AUSTRALIA': 'WA',
      'SOUTH AUSTRALIA': 'SA',
      'TASMANIA': 'TAS',
      'NORTHERN TERRITORY': 'NT',
      'AUSTRALIAN CAPITAL TERRITORY': 'ACT',
    }

    // Validate state - accept both full names and abbreviations
    const validStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT']
    let upperState = state.toUpperCase().trim()

    // Convert full state name to code if needed
    if (stateNameToCode[upperState]) {
      upperState = stateNameToCode[upperState]
    }

    if (!validStates.includes(upperState)) {
      // Only warn, don't error - let the carrier API handle final validation
      warnings.push(`State "${state}" may need verification`)
    }

    // Validate postcode matches state
    const statePostcodeRanges: Record<string, [number, number][]> = {
      'NSW': [[2000, 2599], [2619, 2899], [2921, 2999]],
      'VIC': [[3000, 3999], [8000, 8999]],
      'QLD': [[4000, 4999], [9000, 9999]],
      'SA': [[5000, 5799], [5800, 5999]],
      'WA': [[6000, 6797], [6800, 6999]],
      'TAS': [[7000, 7799], [7800, 7999]],
      'NT': [[800, 899], [900, 999]],
      'ACT': [[200, 299], [2600, 2618], [2900, 2920]]
    }

    if (validStates.includes(upperState)) {
      const postcodeNum = parseInt(postcode)
      const ranges = statePostcodeRanges[upperState]
      const matches = ranges.some(([min, max]) => postcodeNum >= min && postcodeNum <= max)

      if (!matches) {
        warnings.push(`Postcode ${postcode} may not match state ${upperState}`)
      }
    }

    // Check for common address issues
    if (address1.length < 5) {
      errors.push('Address line 1 is too short')
    }

    if (!/\d/.test(address1)) {
      warnings.push('Address line 1 should include a street number')
    }

    // Common street type abbreviations
    const streetTypes = ['ST', 'STREET', 'RD', 'ROAD', 'AVE', 'AVENUE', 'DR', 'DRIVE', 'CT', 'COURT', 'PL', 'PLACE', 'LANE', 'LN', 'WAY', 'CRES', 'CRESCENT', 'TCE', 'TERRACE', 'HWY', 'HIGHWAY', 'BLVD', 'BOULEVARD', 'CL', 'CLOSE', 'CIR', 'CIRCLE', 'PARADE', 'PDE']
    const hasStreetType = streetTypes.some(type =>
      address1.toUpperCase().includes(` ${type}`) || address1.toUpperCase().endsWith(type)
    )

    if (!hasStreetType) {
      warnings.push('Address may be missing street type (St, Rd, Ave, etc.)')
    }

    // Try AusPost PAF validation if credentials available
    const apiKey = process.env.AUSPOST_API_KEY
    const apiSecret = process.env.AUSPOST_API_SECRET

    if (apiKey && apiSecret && errors.length === 0) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

        const addressData = {
          lines: [address1, address2].filter(Boolean),
          suburb: city,
          state: upperState,
          postcode: postcode,
          country: 'AU'
        }

        const response = await fetch(`${AUSPOST_API_URL}/shipping/v1/address/validate`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(addressData)
        })

        if (response.ok) {
          const data = await response.json()

          return NextResponse.json({
            isValid: data.is_valid !== false,
            isDeliverable: data.is_deliverable !== false,
            normalizedAddress: data.normalized_address ? {
              address1: data.normalized_address.lines?.[0] || address1,
              address2: data.normalized_address.lines?.[1],
              city: data.normalized_address.suburb || city,
              state: data.normalized_address.state || state,
              postcode: data.normalized_address.postcode || postcode
            } : undefined,
            suggestions: data.suggestions?.map((s: any) => ({
              address1: s.lines?.[0] || '',
              city: s.suburb || '',
              state: s.state || '',
              postcode: s.postcode || ''
            })),
            warnings: warnings.length > 0 ? warnings : undefined
          } as AddressValidationResponse)
        }
      } catch (err) {
        // Fall through to basic validation
        console.error('AusPost validation error:', err)
      }
    }

    // Return basic validation result
    return NextResponse.json({
      isValid: errors.length === 0,
      isDeliverable: errors.length === 0,
      normalizedAddress: errors.length === 0 ? {
        address1: address1.trim(),
        address2: address2?.trim(),
        city: city.trim().toUpperCase(),
        state: upperState,
        postcode: postcode.trim()
      } : undefined,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    } as AddressValidationResponse)

  } catch (error: any) {
    console.error('Address validation error:', error)
    return NextResponse.json(
      { isValid: false, isDeliverable: false, errors: [error.message] },
      { status: 500 }
    )
  }
}
