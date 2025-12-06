import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/page-improvements - List pending improvements for review
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams

    // Use the view for pending improvements
    const status = searchParams.get('status') || 'pending_review'
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('dashboard_page_improvements')
      .select(`
        id,
        title,
        description,
        improvement_type,
        priority_score,
        estimated_effort,
        suggested_by,
        status,
        created_at,
        page_id,
        dashboard_pages!inner (
          page_name,
          route,
          category
        )
      `)
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: improvements, error } = await query

    if (error) {
      console.error('Page improvements fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data to flatten the join
    const transformed = (improvements || []).map((imp: any) => ({
      id: imp.id,
      title: imp.title,
      description: imp.description,
      improvement_type: imp.improvement_type,
      priority_score: imp.priority_score,
      estimated_effort: imp.estimated_effort,
      suggested_by: imp.suggested_by,
      status: imp.status,
      created_at: imp.created_at,
      page_id: imp.page_id,
      page_name: imp.dashboard_pages?.page_name || 'Unknown',
      route: imp.dashboard_pages?.route || '',
      page_category: imp.dashboard_pages?.category || '',
    }))

    // Get count of pending improvements
    const { count } = await supabase
      .from('dashboard_page_improvements')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review')

    return NextResponse.json({
      improvements: transformed,
      count: count || 0,
    })
  } catch (error: any) {
    console.error('Page improvements API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/page-improvements - Create a new improvement suggestion
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const {
      page_id,
      analysis_id,
      title,
      description,
      improvement_type,
      priority_score = 5,
      estimated_effort = 'medium',
      suggested_by = 'continuous-improvement',
    } = body

    // Validate required fields
    if (!page_id || !title || !description || !improvement_type) {
      return NextResponse.json(
        { error: 'Missing required fields: page_id, title, description, improvement_type' },
        { status: 400 }
      )
    }

    // Validate improvement_type
    const validTypes = ['ux', 'performance', 'feature', 'code_quality']
    if (!validTypes.includes(improvement_type)) {
      return NextResponse.json(
        { error: `Invalid improvement_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Insert improvement
    const { data: improvement, error } = await supabase
      .from('dashboard_page_improvements')
      .insert({
        page_id,
        analysis_id,
        title,
        description,
        improvement_type,
        priority_score,
        estimated_effort,
        suggested_by,
        status: 'pending_review',
      })
      .select()
      .single()

    if (error) {
      console.error('Create improvement error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ improvement }, { status: 201 })
  } catch (error: any) {
    console.error('Create improvement API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
