import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'data', 'ktra.db'))

async function checkAdminSession() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAdminSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any

    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 같은 이메일로 주문한 모든 주문 및 참가자 조회
    const relatedOrders = db.prepare(
      'SELECT * FROM orders WHERE buyer_email = ? ORDER BY id'
    ).all(order.buyer_email)

    const allParticipants = db.prepare(`
      SELECT p.*, o.id as order_id_ref, o.course as order_course
      FROM participants p
      JOIN orders o ON p.order_id = o.id
      WHERE o.buyer_email = ?
      ORDER BY o.id, p.participant_index
    `).all(order.buyer_email)

    return NextResponse.json({
      order,
      participants: allParticipants,
      relatedOrders,
      emailTotalParticipants: relatedOrders.reduce((sum: number, o: any) => sum + (o.total_participants || 0), 0)
    })
  } catch (error) {
    console.error('Admin order detail error:', error)
    return NextResponse.json({ error: '주문 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAdminSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const {
      buyer_name,
      buyer_email,
      buyer_phone,
      buyer_gender,
      course,
      total_amount,
      total_participants,
      recipient_name,
      recipient_phone,
      zipcode,
      address,
      address_detail
    } = body

    // 기존 참가자 수 조회
    const currentOrder = db.prepare('SELECT total_participants FROM orders WHERE id = ?').get(id) as { total_participants: number } | undefined
    const currentCount = currentOrder?.total_participants || 0
    const newCount = parseInt(total_participants) || 1

    // 주문 정보 업데이트
    db.prepare(`
      UPDATE orders SET
        buyer_name = ?,
        buyer_email = ?,
        buyer_phone = ?,
        buyer_gender = ?,
        course = ?,
        total_amount = ?,
        total_participants = ?,
        recipient_name = ?,
        recipient_phone = ?,
        zipcode = ?,
        address = ?,
        address_detail = ?
      WHERE id = ?
    `).run(
      buyer_name,
      buyer_email,
      buyer_phone,
      buyer_gender,
      course,
      total_amount,
      newCount,
      recipient_name,
      recipient_phone,
      zipcode,
      address,
      address_detail,
      id
    )

    // 참가자 수 변경 시 participants 테이블 동기화
    if (newCount !== currentCount) {
      if (newCount < currentCount) {
        // 참가자 수 감소: 뒤에서부터 삭제 (미입력된 것 우선)
        db.prepare(`
          DELETE FROM participants
          WHERE order_id = ? AND participant_index > ?
        `).run(id, newCount)
      } else {
        // 참가자 수 증가: 새 참가자 레코드 추가
        const insertStmt = db.prepare(`
          INSERT INTO participants (order_id, participant_index, course, is_primary, is_completed)
          VALUES (?, ?, ?, 0, 0)
        `)
        for (let i = currentCount + 1; i <= newCount; i++) {
          insertStmt.run(id, i, course)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin order update error:', error)
    return NextResponse.json({ error: '주문 수정 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
