import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'data', 'ktra.db'))

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('admin_session')?.value

    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM orders) as totalOrders,
        (SELECT COUNT(*) FROM participants) as totalParticipants,
        (SELECT COUNT(*) FROM participants WHERE is_completed = 1) as completedParticipants
    `).get()

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: '통계 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
