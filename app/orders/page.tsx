'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Participant {
  id: number
  order_id: number
  participant_index: number
  name: string | null
  gender: string | null
  course: string
  order_course: string
  order_buyer_name: string
  is_primary: number
  is_completed: number
}

interface Order {
  id: number
  buyer_email: string
  buyer_name: string
  buyer_phone: string
  total_participants: number
  product_name: string
  course: string
  recipient_name: string
  recipient_phone: string
  zipcode: string
  address: string
  address_detail: string
  total_amount: number
  participants: Participant[]
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [email, setEmail] = useState('')
  const [emailTotalParticipants, setEmailTotalParticipants] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isAllCompleted, setIsAllCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders')
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/')
          return
        }
        setError(data.error)
        return
      }

      setOrders(data.orders)
      setEmail(data.email)
      setEmailTotalParticipants(data.emailTotalParticipants || 0)
      setCompletedCount(data.completedCount || 0)
      setTotalCount(data.totalCount || 0)
      setIsAllCompleted(data.isAllCompleted || false)
    } catch {
      setError('주문 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const formatPhone = (phone: string) => {
    if (!phone) return '-'
    const numbers = phone.replace(/\D/g, '')
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    }
    return phone
  }

  const formatCourse = (course: string) => {
    const colors: Record<string, string> = {
      '5K': 'bg-green-100 text-green-700',
      '10K': 'bg-blue-100 text-blue-700',
      'Half': 'bg-purple-100 text-purple-700'
    }
    return colors[course] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  // 대표 구매자 정보 (첫 번째 주문 기준)
  const primaryOrder = orders[0]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">2026 성남마라톤대회 - 참가자 정보 입력</h1>
          <p className="text-gray-500 text-sm mt-1">{email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          로그아웃
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          주문 정보가 없습니다.
        </div>
      ) : (
        <div className="space-y-6">
          {/* 전체 입력 현황 */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-6 border-b bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-2">입력 현황</h2>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>총 주문: <span className="font-medium text-dark">{orders.length}건</span></p>
                    <p>총 참가자: <span className="font-medium text-dark">{emailTotalParticipants}명</span></p>
                  </div>
                </div>
                <div className="text-right">
                  {isAllCompleted ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
                      모두 입력 완료
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm">
                      {completedCount}/{totalCount} 입력
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 배송지 정보 (첫 번째 주문 기준) */}
            {primaryOrder && (
              <div className="px-6 py-4 border-b">
                <h3 className="text-sm font-medium text-gray-500 mb-2">배송지 정보</h3>
                <div className="text-sm">
                  <p><span className="text-gray-500">수령인:</span> {primaryOrder.recipient_name}</p>
                  <p><span className="text-gray-500">연락처:</span> {formatPhone(primaryOrder.recipient_phone)}</p>
                  <p><span className="text-gray-500">주소:</span> ({primaryOrder.zipcode}) {primaryOrder.address} {primaryOrder.address_detail}</p>
                </div>
              </div>
            )}

            {/* 참가자 목록 (주문별 그룹) */}
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">
                참가자 정보 입력 ({completedCount}/{totalCount})
              </h3>

              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id}>
                    {/* 주문이 여러 개인 경우 구분선 표시 */}
                    {orders.length > 1 && (
                      <div className="mb-3 pb-2 border-b border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${formatCourse(order.course)}`}>
                            {order.course}
                          </span>
                          <span>주문 #{order.id}</span>
                          <span className="text-gray-400">({order.total_participants}명)</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {order.participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              participant.is_completed
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-500'
                            }`}>
                              {participant.is_primary ? '본' : participant.participant_index}
                            </div>
                            <div>
                              {participant.is_completed ? (
                                <p className="font-medium">{participant.name}</p>
                              ) : (
                                <p className="text-gray-400">미입력</p>
                              )}
                              <p className="text-xs text-gray-500">
                                {participant.is_primary ? '본인 (대표 구매자)' : `추가 참가자 ${participant.participant_index}`}
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${formatCourse(participant.course || order.course)}`}>
                                  {participant.course || order.course}
                                </span>
                              </p>
                            </div>
                          </div>
                          <Link
                            href={`/form/${order.id}/${participant.participant_index}`}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              participant.is_completed
                                ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                : 'bg-primary text-white hover:opacity-90'
                            }`}
                          >
                            {participant.is_completed ? '수정하기' : '입력하기'}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
