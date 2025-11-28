import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Recent emails with company name
    const { data: emails, error: emailsError } = await supabase
      .from('prospecting_emails')
      .select(`
        id,
        email_type,
        recipient_email,
        subject,
        status,
        sent_at,
        scheduled_for,
        queue_id,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (emailsError) {
      console.error('Emails fetch error:', emailsError)
    }

    // Get company names for emails
    const emailsWithCompany = []
    if (emails && emails.length > 0) {
      const queueIds = [...new Set(emails.map(e => e.queue_id).filter(Boolean))]

      const { data: queues } = await supabase
        .from('prospecting_queue')
        .select('id, company_name')
        .in('id', queueIds)

      const queueMap = new Map(queues?.map(q => [q.id, q.company_name]) || [])

      for (const email of emails) {
        emailsWithCompany.push({
          ...email,
          company_name: queueMap.get(email.queue_id) || 'Unknown'
        })
      }
    }

    // Recent run logs
    const { data: runs, error: runsError } = await supabase
      .from('prospecting_run_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5)

    if (runsError) {
      console.error('Runs fetch error:', runsError)
    }

    return NextResponse.json({
      emails: emailsWithCompany,
      runs: runs || []
    })
  } catch (error: any) {
    console.error('Activity fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity' },
      { status: 500 }
    )
  }
}
