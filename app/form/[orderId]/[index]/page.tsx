'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Order {
  id: number
  buyer_name: string
  course: string
  product_name: string
}

interface Participant {
  id: number
  participant_index: number
  name: string | null
  gender: string | null
  birth_date: string | null
  phone: string | null
  course: string
  tshirt_size: string | null
  emergency_contact: string | null
  emergency_relation: string | null
  is_completed: number
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL']

export default function ParticipantFormPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.orderId as string
  const index = parseInt(params.index as string)

  const [order, setOrder] = useState<Order | null>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    gender: 'M',
    birthDate: '',
    phone: '',
    tshirtSize: 'M',
    emergencyContact: '',
    emergencyRelation: '',
    agreePrivacy: false
  })

  useEffect(() => {
    fetchData()
  }, [orderId])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/participants/${orderId}`)
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/')
          return
        }
        setError(data.error)
        return
      }

      setOrder(data.order)

      const currentParticipant = data.participants.find(
        (p: Participant) => p.participant_index === index
      )
      setParticipant(currentParticipant)

      if (currentParticipant) {
        // 기존 데이터가 있으면 로드 (is_completed 여부와 관계없이)
        setFormData({
          name: currentParticipant.name || '',
          gender: currentParticipant.gender || 'M',
          birthDate: currentParticipant.birth_date || '',
          phone: formatPhone(currentParticipant.phone || ''),
          tshirtSize: currentParticipant.tshirt_size || 'M',
          emergencyContact: formatPhone(currentParticipant.emergency_contact || ''),
          emergencyRelation: currentParticipant.emergency_relation || '',
          agreePrivacy: currentParticipant.is_completed ? true : false
        })
      }
    } catch {
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  const handlePhoneChange = (field: 'phone' | 'emergencyContact') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: formatPhone(e.target.value)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const res = await fetch(`/api/participants/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIndex: index,
          ...formData
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/orders')
      }, 1500)
    } catch {
      setError('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
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

  if (error && !order) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">✓</div>
          <p className="text-lg font-medium text-green-600">저장되었습니다!</p>
          <p className="text-gray-500 text-sm mt-2">주문 페이지로 이동합니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/orders" className="text-gray-500 hover:text-gray-700 text-sm">
          ← 주문 목록으로
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* 헤더 */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-dark">
                추가 참가자 {index} 정보 입력
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                대표 구매자: {order?.buyer_name}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${formatCourse(order?.course || '')}`}>
              {order?.course}
            </span>
          </div>
        </div>

        {/* 코스 정보 (읽기 전용) */}
        <div className="px-6 py-4 bg-yellow-50 border-b">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 text-sm">코스:</span>
            <span className="font-medium">{order?.course}</span>
            <span className="text-xs text-yellow-600">(변경 불가)</span>
          </div>
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 이름 */}
          <div>
            <label className="label">이름 <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="input-field"
              placeholder="참가자 이름"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          {/* 성별 */}
          <div>
            <label className="label">성별 <span className="text-red-500">*</span></label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="M"
                  checked={formData.gender === 'M'}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-4 h-4 text-primary"
                />
                <span>남</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="F"
                  checked={formData.gender === 'F'}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-4 h-4 text-primary"
                />
                <span>여</span>
              </label>
            </div>
          </div>

          {/* 생년월일 */}
          <div>
            <label className="label">생년월일 <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="input-field"
              placeholder="예: 19900101 또는 900101"
              value={formData.birthDate}
              onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
              maxLength={8}
              required
            />
            <p className="text-xs text-gray-400 mt-1">YYYYMMDD 또는 YYMMDD 형식</p>
          </div>

          {/* 연락처 */}
          <div>
            <label className="label">연락처 <span className="text-red-500">*</span></label>
            <input
              type="tel"
              className="input-field"
              placeholder="010-0000-0000"
              value={formData.phone}
              onChange={handlePhoneChange('phone')}
              maxLength={13}
              required
            />
          </div>

          {/* 티셔츠 사이즈 */}
          <div>
            <label className="label">티셔츠 사이즈 <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-6 gap-2">
              {SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                    formData.tshirtSize === size
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, tshirtSize: size }))}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* 비상연락처 */}
          <div>
            <label className="label">비상연락처 <span className="text-red-500">*</span></label>
            <input
              type="tel"
              className="input-field"
              placeholder="010-0000-0000"
              value={formData.emergencyContact}
              onChange={handlePhoneChange('emergencyContact')}
              maxLength={13}
              required
            />
          </div>

          {/* 비상연락처 관계 */}
          <div>
            <label className="label">비상연락처 관계 <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="input-field"
              placeholder="예: 배우자, 부모, 친구"
              value={formData.emergencyRelation}
              onChange={(e) => setFormData(prev => ({ ...prev, emergencyRelation: e.target.value }))}
              required
            />
          </div>

          {/* 개인정보 수집 및 이용 동의 */}
          <div className="pt-4 border-t">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-sm mb-2">개인정보 수집 및 이용 동의</h3>
              <div className="text-xs text-gray-600 space-y-2 max-h-32 overflow-y-auto">
                <p><strong>1. 수집하는 개인정보 항목</strong><br/>
                이름, 성별, 생년월일, 연락처, 비상연락처, 티셔츠 사이즈</p>
                <p><strong>2. 개인정보의 수집 및 이용 목적</strong><br/>
                - 2026 성남마라톤대회 참가자 등록 및 관리<br/>
                - 대회 운영 및 안내 사항 전달<br/>
                - 응급상황 발생 시 비상연락처 활용<br/>
                - 기념품(티셔츠) 제작 및 배송</p>
                <p><strong>3. 개인정보의 보유 및 이용 기간</strong><br/>
                대회 종료 후 1년간 보유 후 파기</p>
                <p><strong>4. 동의 거부권 및 불이익</strong><br/>
                귀하는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다.
                다만, 동의를 거부할 경우 대회 참가 등록이 불가능합니다.</p>
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.agreePrivacy}
                onChange={(e) => setFormData(prev => ({ ...prev, agreePrivacy: e.target.checked }))}
                className="w-5 h-5 mt-0.5 text-primary rounded border-gray-300 focus:ring-primary"
                required
              />
              <span className="text-sm">
                위 개인정보 수집 및 이용에 동의합니다. <span className="text-red-500">*</span>
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Link
              href="/orders"
              className="flex-1 text-center py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              취소
            </Link>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={saving}
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
