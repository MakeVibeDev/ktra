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

    // 복수 구매자 통계 (대시보드용)
    const multiStats = db.prepare(`
      SELECT
        COUNT(*) as total_buyers,
        SUM(total_participants) as total_participants,
        SUM(completed_count) as completed_participants
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
    `).get() as { total_buyers: number, total_participants: number, completed_participants: number }

    if (filter === 'multi') {
      // 복수 구매자 모드: buyer_id별 그룹화
      let searchCondition = ''
      let searchParams: string[] = []

      if (search) {
        searchCondition = `AND (buyer_name LIKE ? OR buyer_id LIKE ? OR buyer_phone LIKE ?)`
        searchParams = [`%${search}%`, `%${search}%`, `%${search}%`]
      }

      // 복수 구매자 수 (검색 적용)
      const countQuery = db.prepare(`
        SELECT COUNT(*) as total FROM (
          SELECT buyer_id
          FROM orders
          WHERE buyer_id IN (
            SELECT buyer_id FROM orders GROUP BY buyer_id HAVING SUM(total_participants) >= 2
          ) ${searchCondition}
          GROUP BY buyer_id
        )
      `).get(...searchParams) as { total: number }

      // buyer_id별 그룹화된 목록
      const buyersQuery = `
        SELECT
          buyer_id,
          MAX(buyer_name) as buyer_name,
          MAX(buyer_phone) as buyer_phone,
          MAX(buyer_gender) as buyer_gender,
          COUNT(*) as order_count,
          SUM(total_participants) as total_participants,
          SUM(total_amount) as total_amount,
          GROUP_CONCAT(DISTINCT course) as courses,
          (SELECT COUNT(*) FROM participants p
           JOIN orders o2 ON p.order_id = o2.id
           WHERE o2.buyer_id = o.buyer_id AND p.is_completed = 1) as completed_count
        FROM orders o
        WHERE buyer_id IN (
          SELECT buyer_id FROM orders GROUP BY buyer_id HAVING SUM(total_participants) >= 2
        ) ${searchCondition}
        GROUP BY buyer_id
        ORDER BY total_participants DESC, buyer_id
        LIMIT ? OFFSET ?
      `
      const buyers = db.prepare(buyersQuery).all(...searchParams, limit, offset)

      return NextResponse.json({
        mode: 'multi',
        buyers,
        total: countQuery.total,
        page,
        totalPages: Math.ceil(countQuery.total / limit),
        stats: multiStats
      })
    }

    // 일반 모드: 전체 주문 목록
    let whereConditions: string[] = []
    let params: any[] = []

    if (search) {
      whereConditions.push(`(buyer_name LIKE ? OR buyer_id LIKE ? OR buyer_phone LIKE ?)`)
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
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
        (SELECT SUM(total_participants) FROM orders WHERE buyer_id = o.buyer_id) as buyer_total_participants,
        (SELECT COUNT(*) FROM participants p JOIN orders o2 ON p.order_id = o2.id WHERE o2.buyer_id = o.buyer_id AND p.is_completed = 1) as buyer_completed_count
      FROM orders o
      ${whereClause}
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
    `
    const orders = db.prepare(ordersQuery).all(...params, limit, offset)

    return NextResponse.json({
      mode: 'all',
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: multiStats
    })
  } catch (error) {
    console.error('Admin orders error:', error)
    return NextResponse.json({ error: '주문 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
