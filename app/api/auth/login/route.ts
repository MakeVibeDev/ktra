import { NextRequest, NextResponse } from 'next/server'
import { findOrdersByBuyerIdAndPhone, createSession } from '@/lib/db'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json()

    if (!email || !phone) {
      return NextResponse.json(
        { error: '이메일과 전화번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 전화번호 정규화 (하이픈 제거, 숫자만)
    const normalizedPhone = phone.replace(/\D/g, '')

    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { error: '올바른 전화번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    // buyer_id 기준으로 복수 구매 주문 조회
    const orders = findOrdersByBuyerIdAndPhone(email, normalizedPhone)

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: '일치하는 복수 구매 주문을 찾을 수 없습니다.\n회원가입 시 사용한 이메일과 주문 시 입력한 전화번호를 확인해주세요.' },
        { status: 401 }
      )
    }

    // 세션 생성 (buyer_id 저장)
    const sessionId = createSession(email.toLowerCase(), normalizedPhone)

    // 쿠키에 세션 저장
    const cookieStore = await cookies()
    cookieStore.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24시간
      path: '/'
    })

    return NextResponse.json({
      success: true,
      email: email.toLowerCase(),
      orderCount: orders.length
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
