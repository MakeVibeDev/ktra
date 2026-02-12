import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Database from 'better-sqlite3'
import path from 'path'
import * as XLSX from 'xlsx'

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
    const filter = searchParams.get('filter') || 'all'

    let whereClause = ''
    if (filter === 'multi') {
      whereClause = `WHERE o.buyer_email IN (
        SELECT buyer_email FROM orders GROUP BY buyer_email HAVING SUM(total_participants) >= 2
      )`
    }

    // 주문 + 참가자 데이터 조회
    const query = `
      SELECT
        o.id as 주문ID,
        o.buyer_name as 구매자명,
        o.buyer_email as 이메일,
        o.buyer_phone as 연락처,
        o.buyer_gender as 구매자성별,
        o.course as 코스,
        o.total_participants as 주문참가자수,
        (SELECT SUM(total_participants) FROM orders WHERE buyer_email = o.buyer_email) as 이메일총참가자,
        o.total_amount as 결제금액,
        o.recipient_name as 수령인,
        o.recipient_phone as 수령인연락처,
        o.zipcode as 우편번호,
        o.address as 주소,
        o.address_detail as 상세주소,
        p.participant_index as 참가자순번,
        p.name as 참가자명,
        p.gender as 참가자성별,
        p.birth_date as 생년월일,
        p.phone as 참가자연락처,
        p.course as 참가자코스,
        p.tshirt_size as 티셔츠사이즈,
        p.emergency_contact as 비상연락처,
        p.emergency_relation as 비상연락처관계,
        CASE WHEN p.is_primary = 1 THEN 'Y' ELSE 'N' END as 대표구매자여부,
        CASE WHEN p.is_completed = 1 THEN 'Y' ELSE 'N' END as 입력완료여부
      FROM orders o
      LEFT JOIN participants p ON o.id = p.order_id
      ${whereClause}
      ORDER BY o.id, p.participant_index
    `

    const data = db.prepare(query).all()

    // 엑셀 생성
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '주문목록')

    // 컬럼 너비 설정
    worksheet['!cols'] = [
      { wch: 8 },  // 주문ID
      { wch: 12 }, // 구매자명
      { wch: 30 }, // 이메일
      { wch: 15 }, // 연락처
      { wch: 10 }, // 구매자성별
      { wch: 8 },  // 코스
      { wch: 12 }, // 주문참가자수
      { wch: 14 }, // 이메일총참가자
      { wch: 12 }, // 결제금액
      { wch: 12 }, // 수령인
      { wch: 15 }, // 수령인연락처
      { wch: 8 },  // 우편번호
      { wch: 40 }, // 주소
      { wch: 20 }, // 상세주소
      { wch: 10 }, // 참가자순번
      { wch: 12 }, // 참가자명
      { wch: 10 }, // 참가자성별
      { wch: 12 }, // 생년월일
      { wch: 15 }, // 참가자연락처
      { wch: 10 }, // 참가자코스
      { wch: 12 }, // 티셔츠사이즈
      { wch: 15 }, // 비상연락처
      { wch: 12 }, // 비상연락처관계
      { wch: 12 }, // 대표구매자여부
      { wch: 12 }, // 입력완료여부
    ]

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const filename = filter === 'multi'
      ? `복수구매자_주문목록_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `전체_주문목록_${new Date().toISOString().slice(0, 10)}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: '엑셀 다운로드 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
