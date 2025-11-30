import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Manifest API placeholder'
  })
}

export async function GET() {
  return NextResponse.json({
    manifests: [],
    message: 'Manifest list placeholder'
  })
}
