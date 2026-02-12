'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Order {
  id: number
  buyer_name: string
  buyer_email: string
  buyer_phone: string
  buyer_gender: string
  course: string
  total_participants: number
  total_amount: number
  recipient_name: string
  recipient_phone: string
  zipcode: string
  address: string
  address_detail: string
  product_name: string
  option_raw: string
}

interface Participant {
  id: number
  order_id: number
  order_id_ref: number
  participant_index: number
  name: string | null
  gender: string | null
  birth_date: string | null
  phone: string | null
  course: string
  order_course: string
  tshirt_size: string | null
  emergency_contact: string | null
  emergency_relation: string | null
  is_primary: number
  is_completed: number
}

interface RelatedOrder {
  id: number
  total_participants: number
  course: string
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL']

function AdminOrderDetailContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id as string
  const filter = searchParams.get('filter') || 'all'

  const [order, setOrder] = useState<Order | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [relatedOrders, setRelatedOrders] = useState<RelatedOrder[]>([])
  const [emailTotalParticipants, setEmailTotalParticipants] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<number | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      setOrder(data.order)
      setParticipants(data.participants)
      setRelatedOrders(data.relatedOrders || [])
      setEmailTotalParticipants(data.emailTotalParticipants || 0)
    } catch {
      router.push('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  const handleOrderChange = (field: string, value: string) => {
    if (order) {
      setOrder({ ...order, [field]: value })
    }
  }

  const handleSaveOrder = async () => {
    if (!order) return
    setSaving(true)
    setMessage('')

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      })

      if (res.ok) {
        setMessage('주문 정보가 저장되었습니다.')
      } else {
        setMessage('저장에 실패했습니다.')
      }
    } catch {
      setMessage('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleParticipantChange = (id: number, field: string, value: string | boolean) => {
    setParticipants(prev =>
      prev.map(p => p.id === id ? { ...p, [field]: value } : p)
    )
  }

  const handleSaveParticipant = async (participant: Participant) => {
    setSaving(true)
    setMessage('')

    try {
      const res = await fetch(`/api/admin/participants/${participant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participant)
      })

      if (res.ok) {
        setMessage('참가자 정보가 저장되었습니다.')
        setEditingParticipant(null)
      } else {
        setMessage('저장에 실패했습니다.')
      }
    } catch {
      setMessage('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-red-500">주문을 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/admin/orders?filter=${filter}`} className="text-gray-500 hover:text-gray-700 text-sm">
          ← 주문 목록
        </Link>
        <h1 className="text-2xl font-bold mt-2">주문 상세 #{order.id}</h1>
        {emailTotalParticipants > 1 && (
          <p className="text-sm text-gray-500 mt-1">
            이메일 기준 총 {emailTotalParticipants}명 ({relatedOrders.length}개 주문)
          </p>
        )}
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.includes('실패') || message.includes('오류') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      {/* 주문 정보 */}
      <div className="bg-white rounded-xl shadow mb-6">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold">주문 정보</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">구매자명</label>
              <input
                type="text"
                className="input-field"
                value={order.buyer_name}
                onChange={(e) => handleOrderChange('buyer_name', e.target.value)}
              />
            </div>
            <div>
              <label className="label">성별</label>
              <select
                className="input-field"
                value={order.buyer_gender || ''}
                onChange={(e) => handleOrderChange('buyer_gender', e.target.value)}
              >
                <option value="">선택</option>
                <option value="M">남</option>
                <option value="F">여</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">이메일</label>
              <input
                type="email"
                className="input-field"
                value={order.buyer_email}
                onChange={(e) => handleOrderChange('buyer_email', e.target.value)}
              />
            </div>
            <div>
              <label className="label">연락처</label>
              <input
                type="text"
                className="input-field"
                value={order.buyer_phone || ''}
                onChange={(e) => handleOrderChange('buyer_phone', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">코스</label>
              <select
                className="input-field"
                value={order.course || ''}
                onChange={(e) => handleOrderChange('course', e.target.value)}
              >
                <option value="5K">5K</option>
                <option value="10K">10K</option>
                <option value="Half">Half</option>
              </select>
            </div>
            <div>
              <label className="label">금액</label>
              <input
                type="number"
                className="input-field"
                value={order.total_amount || 0}
                onChange={(e) => handleOrderChange('total_amount', e.target.value)}
              />
            </div>
            <div>
              <label className="label">참가자수</label>
              <input
                type="number"
                className="input-field"
                value={order.total_participants || 1}
                onChange={(e) => handleOrderChange('total_participants', e.target.value)}
              />
            </div>
          </div>

          <hr />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">수령인</label>
              <input
                type="text"
                className="input-field"
                value={order.recipient_name || ''}
                onChange={(e) => handleOrderChange('recipient_name', e.target.value)}
              />
            </div>
            <div>
              <label className="label">수령인 연락처</label>
              <input
                type="text"
                className="input-field"
                value={order.recipient_phone || ''}
                onChange={(e) => handleOrderChange('recipient_phone', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">우편번호</label>
            <input
              type="text"
              className="input-field w-32"
              value={order.zipcode || ''}
              onChange={(e) => handleOrderChange('zipcode', e.target.value)}
            />
          </div>

          <div>
            <label className="label">주소</label>
            <input
              type="text"
              className="input-field"
              value={order.address || ''}
              onChange={(e) => handleOrderChange('address', e.target.value)}
            />
          </div>

          <div>
            <label className="label">상세주소</label>
            <input
              type="text"
              className="input-field"
              value={order.address_detail || ''}
              onChange={(e) => handleOrderChange('address_detail', e.target.value)}
            />
          </div>

          <button
            onClick={handleSaveOrder}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? '저장 중...' : '주문 정보 저장'}
          </button>
        </div>
      </div>

      {/* 참가자 목록 */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold">
            참가자 목록 ({participants.length}명)
            {emailTotalParticipants > 1 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                - 이메일 기준 총 {participants.filter(p => p.is_completed).length}/{emailTotalParticipants} 완료
              </span>
            )}
          </h2>
        </div>
        <div className="divide-y">
          {relatedOrders.map((relOrder) => {
            const orderParticipants = participants.filter(p => p.order_id === relOrder.id)
            if (orderParticipants.length === 0) return null

            return (
              <div key={relOrder.id} className={relOrder.id !== order.id ? 'bg-gray-50' : ''}>
                {relatedOrders.length > 1 && (
                  <div className="px-4 py-2 bg-gray-100 text-xs text-gray-600 border-b">
                    주문 #{relOrder.id} ({relOrder.course}, {relOrder.total_participants}명)
                    {relOrder.id !== order.id && (
                      <Link href={`/admin/orders/${relOrder.id}?filter=${filter}`} className="ml-2 text-primary hover:underline">
                        바로가기
                      </Link>
                    )}
                  </div>
                )}
                {orderParticipants.map((p) => (
                  <div key={p.id} className="p-4 border-b last:border-b-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${p.is_primary ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                          {p.is_primary ? '대표' : `참가자 ${p.participant_index}`}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${p.is_completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {p.is_completed ? '입력완료' : '미입력'}
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingParticipant(editingParticipant === p.id ? null : p.id)}
                        className="text-sm text-primary hover:underline"
                      >
                        {editingParticipant === p.id ? '접기' : '수정'}
                      </button>
                    </div>

                    {editingParticipant === p.id ? (
                      <div className="space-y-3 bg-white p-4 rounded-lg border">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label text-xs">이름</label>
                            <input
                              type="text"
                              className="input-field text-sm"
                              value={p.name || ''}
                              onChange={(e) => handleParticipantChange(p.id, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="label text-xs">성별</label>
                            <select
                              className="input-field text-sm"
                              value={p.gender || ''}
                              onChange={(e) => handleParticipantChange(p.id, 'gender', e.target.value)}
                            >
                              <option value="">선택</option>
                              <option value="M">남</option>
                              <option value="F">여</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label text-xs">생년월일</label>
                            <input
                              type="text"
                              className="input-field text-sm"
                              value={p.birth_date || ''}
                              onChange={(e) => handleParticipantChange(p.id, 'birth_date', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="label text-xs">연락처</label>
                            <input
                              type="text"
                              className="input-field text-sm"
                              value={p.phone || ''}
                              onChange={(e) => handleParticipantChange(p.id, 'phone', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label text-xs">코스</label>
                            <select
                              className="input-field text-sm"
                              value={p.course || ''}
                              onChange={(e) => handleParticipantChange(p.id, 'course', e.target.value)}
                            >
                              <option value="5K">5K</option>
                              <option value="10K">10K</option>
                              <option value="Half">Half</option>
                            </select>
                          </div>
                          <div>
                            <label className="label text-xs">티셔츠</label>
                            <select
                              className="input-field text-sm"
                              value={p.tshirt_size || ''}
                              onChange={(e) => handleParticipantChange(p.id, 'tshirt_size', e.target.value)}
                            >
                              <option value="">선택</option>
                              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label text-xs">비상연락처</label>
                            <input
                              type="text"
                              className="input-field text-sm"
                              value={p.emergency_contact || ''}
                              onChange={(e) => handleParticipantChange(p.id, 'emergency_contact', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="label text-xs">관계</label>
                            <input
                              type="text"
                              className="input-field text-sm"
                              value={p.emergency_relation || ''}
                              onChange={(e) => handleParticipantChange(p.id, 'emergency_relation', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`completed-${p.id}`}
                            checked={!!p.is_completed}
                            onChange={(e) => handleParticipantChange(p.id, 'is_completed', e.target.checked)}
                            className="w-4 h-4"
                          />
                          <label htmlFor={`completed-${p.id}`} className="text-sm">입력 완료</label>
                        </div>

                        <button
                          onClick={() => handleSaveParticipant(p)}
                          disabled={saving}
                          className="btn-primary text-sm"
                        >
                          {saving ? '저장 중...' : '참가자 정보 저장'}
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">
                        {p.name || '(이름 없음)'} | {p.gender === 'M' ? '남' : p.gender === 'F' ? '여' : '-'} | {p.course} | {p.tshirt_size || '-'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function AdminOrderDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center text-gray-500">로딩 중...</div>}>
      <AdminOrderDetailContent />
    </Suspense>
  )
}
