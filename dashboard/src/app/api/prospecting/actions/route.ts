import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { action, queueId, reason } = await request.json()

    if (!queueId) {
      return NextResponse.json(
        { error: 'queueId is required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'skip': {
        const { error } = await supabase
          .from('prospecting_queue')
          .update({
            queue_status: 'skipped',
            skipped_reason: reason || 'Skipped via dashboard',
            skipped_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', queueId)

        if (error) throw error
        break
      }

      case 'retry': {
        const { error } = await supabase
          .from('prospecting_queue')
          .update({
            queue_status: 'pending',
            last_error: null,
            retry_count: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', queueId)

        if (error) throw error
        break
      }

      case 'cancel_emails': {
        const { error } = await supabase
          .from('prospecting_emails')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('queue_id', queueId)
          .eq('status', 'pending')

        if (error) throw error
        break
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Action error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to perform action' },
      { status: 500 }
    )
  }
}
