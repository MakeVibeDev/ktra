import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { id, password } = await request.json()

    const adminId = process.env.ADMIN_ID || 'admin'
    const adminPassword = process.env.ADMIN_PASSWORD || 'ktra2026!'

    if (id !== adminId || password !== adminPassword) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      )
    }

    // 관리자 세션 생성
    const sessionId = crypto.randomBytes(32).toString('hex')
    const cookieStore = await cookies()

    cookieStore.set('admin_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8 // 8시간
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
