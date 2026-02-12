import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'data', 'ktra.db'))

async function checkAdminSession() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value
}

export async function GET(request: NextRequest) {
  try {
    const session = await checkAdminSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // all, multi
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let whereConditions: string[] = []
    let params: any[] = []

    if (search) {
      whereConditions.push(`(buyer_name LIKE ? OR buyer_email LIKE ? OR buyer_phone LIKE ?)`)
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    // 복수 구매자 필터 (이메일별 총 참가자 >= 2)
    if (filter === 'multi') {
      whereConditions.push(`buyer_email IN (
        SELECT buyer_email FROM orders GROUP BY buyer_email HAVING SUM(total_participants) >= 2
      )`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // 총 개수
    const countQuery = `SELECT COUNT(*) as total FROM orders ${whereClause}`
    const { total } = db.prepare(countQuery).get(...params) as { total: number }

    // 주문 목록
    const ordersQuery = `
      SELECT o.*,
        (SELECT COUNT(*) FROM participants WHERE order_id = o.id) as participant_count,
        (SELECT COUNT(*) FROM participants WHERE order_id = o.id AND is_completed = 1) as completed_count,
        (SELECT SUM(total_participants) FROM orders WHERE buyer_email = o.buyer_email) as email_total_participants,
        (SELECT COUNT(*) FROM participants p JOIN orders o2 ON p.order_id = o2.id WHERE o2.buyer_email = o.buyer_email AND p.is_completed = 1) as email_completed_count
      FROM orders o
      ${whereClause}
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
    `
    const orders = db.prepare(ordersQuery).all(...params, limit, offset)

    return NextResponse.json({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Admin orders error:', error)
    return NextResponse.json({ error: '주문 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
