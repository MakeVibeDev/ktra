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

    // 복수 구매자 통계
    const multiStats = db.prepare(`
      SELECT
        COUNT(*) as multiBuyers,
        SUM(total_participants) as multiTotalParticipants,
        SUM(completed_count) as multiCompletedParticipants
      FROM (
        SELECT
          buyer_id,
          SUM(total_participants) as total_participants,
          (SELECT COUNT(*) FROM participants p
           JOIN orders o2 ON p.order_id = o2.id
           WHERE o2.buyer_id = o.buyer_id AND p.is_completed = 1) as completed_count
        FROM orders o
        GROUP BY buyer_id
        HAVING SUM(total_participants) >= 2
      )
    `).get() as { multiBuyers: number, multiTotalParticipants: number, multiCompletedParticipants: number }

    return NextResponse.json({
      ...stats as object,
      multiBuyers: multiStats.multiBuyers || 0,
      multiTotalParticipants: multiStats.multiTotalParticipants || 0,
      multiCompletedParticipants: multiStats.multiCompletedParticipants || 0
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: '통계 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
