import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json({
    success: true,
    synced: 0,
    message: 'Sync API placeholder'
  })
}
