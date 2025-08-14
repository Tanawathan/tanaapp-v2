import { NextResponse } from 'next/server'

export async function GET() {
	return NextResponse.json({ status: 'ok', route: 'debug/schema' })
}

export const dynamic = 'force-dynamic'
