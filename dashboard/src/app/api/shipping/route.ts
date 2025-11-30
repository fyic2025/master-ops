import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    orders: [],
    counts: { new: 0, printed: 0, shipped: 0, archived: 0 },
    message: 'Shipping API placeholder'
  })
}
