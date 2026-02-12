'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Stats {
  totalOrders: number
  totalParticipants: number
  completedParticipants: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      setStats(data)
    } catch {
      router.push('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          로그아웃
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-gray-500 text-sm">총 주문</div>
          <div className="text-3xl font-bold mt-2">{stats?.totalOrders || 0}건</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-gray-500 text-sm">총 참가자</div>
          <div className="text-3xl font-bold mt-2">{stats?.totalParticipants || 0}명</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-gray-500 text-sm">정보 입력 완료</div>
          <div className="text-3xl font-bold mt-2 text-green-600">
            {stats?.completedParticipants || 0}명
          </div>
        </div>
      </div>

      {/* 메뉴 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/orders"
          className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-lg font-semibold mb-2">주문 관리</h2>
          <p className="text-gray-500 text-sm">주문 내역 조회, 검색 및 수정</p>
        </Link>
      </div>
    </div>
  )
}
