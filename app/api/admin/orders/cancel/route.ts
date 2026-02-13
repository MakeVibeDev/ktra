import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'data', 'ktra.db'))

async function checkAdminSession() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value
}

export async function POST(request: NextRequest) {
  try {
    const session = await checkAdminSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { orderIds } = await request.json()

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: '취소할 주문을 선택해주세요.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const results: { id: number, originalAmount: number, newAmount: number }[] = []

    const updateStmt = db.prepare(`
      UPDATE orders
      SET is_cancelled = 1,
          cancelled_at = ?,
          total_amount = CAST(total_amount * 0.5 AS INTEGER)
      WHERE id = ? AND is_cancelled = 0
    `)

    const getOrderStmt = db.prepare('SELECT id, total_amount FROM orders WHERE id = ?')

    for (const orderId of orderIds) {
      const order = getOrderStmt.get(orderId) as { id: number, total_amount: number } | undefined
      if (order) {
        const originalAmount = order.total_amount
        updateStmt.run(now, orderId)
        results.push({
          id: orderId,
          originalAmount,
          newAmount: Math.floor(originalAmount * 0.5)
        })
      }
    }

    return NextResponse.json({
      success: true,
      cancelled: results.length,
      results
    })
  } catch (error) {
    console.error('Cancel orders error:', error)
    return NextResponse.json({ error: '주문 취소 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
