import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession, findOrderById, findParticipantsByOrderId, upsertParticipant } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
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
        { error: '세션이 만료되었습니다.' },
        { status: 401 }
      )
    }

    const { orderId } = await params
    const order = findOrderById(parseInt(orderId)) as any

    if (!order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 세션의 buyer_id와 주문의 buyer_id가 일치하는지 확인
    if (order.buyer_id.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const participants = findParticipantsByOrderId(parseInt(orderId)) as any[]

    // 대표 구매자의 경우 order에서 기본값 가져오기
    const enrichedParticipants = participants.map(p => {
      if (p.is_primary === 1) {
        return {
          ...p,
          phone: p.phone || (order.buyer_phone ? order.buyer_phone.replace(/-/g, '') : null),
          gender: p.gender || order.buyer_gender
        }
      }
      return p
    })

    return NextResponse.json({
      order,
      participants: enrichedParticipants
    })
  } catch (error) {
    console.error('Participants fetch error:', error)
    return NextResponse.json(
      { error: '참가자 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
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
        { error: '세션이 만료되었습니다.' },
        { status: 401 }
      )
    }

    const { orderId } = await params
    const order = findOrderById(parseInt(orderId)) as any

    if (!order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (order.buyer_id.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      participantIndex,
      name,
      gender,
      birthDate,
      phone,
      tshirtSize,
      emergencyContact,
      emergencyRelation
    } = body

    // 유효성 검증
    if (!name || !gender || !birthDate || !phone || !tshirtSize || !emergencyContact || !emergencyRelation) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 참가자 정보 저장/수정
    upsertParticipant({
      orderId: parseInt(orderId),
      participantIndex,
      name,
      gender,
      birthDate,
      phone: phone.replace(/\D/g, ''),
      course: order.course,
      tshirtSize,
      emergencyContact: emergencyContact.replace(/\D/g, ''),
      emergencyRelation
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Participant update error:', error)
    return NextResponse.json(
      { error: '참가자 정보 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
