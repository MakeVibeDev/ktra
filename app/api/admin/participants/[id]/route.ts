import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'data', 'ktra.db'))

async function checkAdminSession() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value
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
      name,
      gender,
      birth_date,
      phone,
      course,
      tshirt_size,
      emergency_contact,
      emergency_relation,
      is_completed
    } = body

    db.prepare(`
      UPDATE participants SET
        name = ?,
        gender = ?,
        birth_date = ?,
        phone = ?,
        course = ?,
        tshirt_size = ?,
        emergency_contact = ?,
        emergency_relation = ?,
        is_completed = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      gender,
      birth_date,
      phone,
      course,
      tshirt_size,
      emergency_contact,
      emergency_relation,
      is_completed ? 1 : 0,
      id
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin participant update error:', error)
    return NextResponse.json({ error: '참가자 수정 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
