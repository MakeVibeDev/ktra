import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession, getDb } from '@/lib/db'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session')?.value

    if (!sessionId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const session = validateSession(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: '세션이 만료되었습니다. 다시 로그인해주세요.' },
        { status: 401 }
      )
    }

    const db = getDb()

    // buyer_id 기준으로 모든 주문 조회
    const orders = db.prepare(`
      SELECT * FROM orders
      WHERE LOWER(buyer_id) = LOWER(?)
      ORDER BY id
    `).all(session.email) as any[]

    // buyer_id 기준 총 참가자 수 계산
    const buyerIdTotalParticipants = orders.reduce((sum, o) => sum + (o.total_participants || 0), 0)

    // 각 주문에 대한 참가자 목록 조회
    const ordersWithParticipants = orders.map(order => {
      const participants = db.prepare(`
        SELECT * FROM participants
        WHERE order_id = ?
        ORDER BY participant_index
      `).all(order.id) as any[]

      return {
        ...order,
        participants
      }
    })

    // 전체 참가자 목록 (buyer_id 기준)
    const allParticipants = db.prepare(`
      SELECT p.*, o.id as order_id, o.course as order_course, o.buyer_name as order_buyer_name
      FROM participants p
      JOIN orders o ON p.order_id = o.id
      WHERE LOWER(o.buyer_id) = LOWER(?)
      ORDER BY o.id, p.participant_index
    `).all(session.email) as any[]

    const completedCount = allParticipants.filter((p: any) => p.is_completed).length
    const totalCount = allParticipants.length

    return NextResponse.json({
      orders: ordersWithParticipants,
      email: session.email,
      emailTotalParticipants: buyerIdTotalParticipants,
      allParticipants,
      completedCount,
      totalCount,
      isAllCompleted: completedCount === totalCount && totalCount > 0
    })
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: '주문 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
