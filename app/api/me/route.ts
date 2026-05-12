import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('qc_session')?.value
  if (!raw) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
}
