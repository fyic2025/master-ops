import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/xero/reconciliation-patterns - List patterns
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams

    // Build query
    let query = supabase
      .from('xero_reconciliation_patterns')
      .select('*')
      .order('confidence', { ascending: false })
      .order('match_count', { ascending: false })

    // Apply filters
    const business = searchParams.get('business')
    if (business) {
      query = query.eq('business_slug', business)
    }

    const patternType = searchParams.get('pattern_type')
    if (patternType) {
      query = query.eq('pattern_type', patternType)
    }

    const active = searchParams.get('active')
    if (active !== null) {
      query = query.eq('is_active', active === 'true')
    }

    const limit = searchParams.get('limit')
    if (limit) {
      query = query.limit(parseInt(limit))
    } else {
      query = query.limit(100)
    }

    const { data: patterns, error } = await query

    if (error) {
      console.error('Patterns fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate summary stats
    const summary = {
      total: patterns?.length || 0,
      active: patterns?.filter(p => p.is_active).length || 0,
      inactive: patterns?.filter(p => !p.is_active).length || 0,
      totalMatches: patterns?.reduce((sum, p) => sum + (p.match_count || 0), 0) || 0,
      averageConfidence: patterns?.length
        ? patterns.reduce((sum, p) => sum + (p.confidence || 0), 0) / patterns.length
        : 0,
    }

    return NextResponse.json({
      patterns: patterns || [],
      summary,
    })
  } catch (error: any) {
    console.error('Patterns API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/xero/reconciliation-patterns - Create a new pattern
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // Validate required fields
    if (!body.business_slug || !body.pattern_type || !body.pattern_value || !body.account_code) {
      return NextResponse.json(
        { error: 'Missing required fields: business_slug, pattern_type, pattern_value, account_code' },
        { status: 400 }
      )
    }

    // Check if pattern already exists
    const { data: existing } = await supabase
      .from('xero_reconciliation_patterns')
      .select('id')
      .eq('business_slug', body.business_slug)
      .eq('pattern_type', body.pattern_type)
      .eq('pattern_value', body.pattern_value)
      .eq('account_code', body.account_code)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Pattern already exists' },
        { status: 400 }
      )
    }

    // Create pattern
    const { data: pattern, error } = await supabase
      .from('xero_reconciliation_patterns')
      .insert({
        business_slug: body.business_slug,
        pattern_type: body.pattern_type,
        pattern_value: body.pattern_value,
        pattern_regex: body.pattern_regex || null,
        account_code: body.account_code,
        account_name: body.account_name || null,
        contact_id: body.contact_id || null,
        contact_name: body.contact_name || null,
        confidence: body.confidence || 50.0,
        priority: body.priority || 50,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Pattern create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pattern }, { status: 201 })
  } catch (error: any) {
    console.error('Patterns API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/xero/reconciliation-patterns - Update pattern
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'Pattern ID is required' }, { status: 400 })
    }

    // Build update object
    const updateData: any = {}
    if (body.pattern_value !== undefined) updateData.pattern_value = body.pattern_value
    if (body.pattern_regex !== undefined) updateData.pattern_regex = body.pattern_regex
    if (body.account_code !== undefined) updateData.account_code = body.account_code
    if (body.account_name !== undefined) updateData.account_name = body.account_name
    if (body.contact_id !== undefined) updateData.contact_id = body.contact_id
    if (body.contact_name !== undefined) updateData.contact_name = body.contact_name
    if (body.confidence !== undefined) updateData.confidence = body.confidence
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.notes !== undefined) updateData.notes = body.notes

    const { data: pattern, error } = await supabase
      .from('xero_reconciliation_patterns')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Pattern update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pattern })
  } catch (error: any) {
    console.error('Patterns API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/xero/reconciliation-patterns - Delete pattern
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Pattern ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('xero_reconciliation_patterns')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Pattern delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Patterns API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
