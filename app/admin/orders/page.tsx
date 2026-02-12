'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  participant_count: number
  completed_count: number
  email_total_participants: number
  email_completed_count: number
}

function AdminOrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [page, filter])

  // URL 파라미터 동기화
  useEffect(() => {
    const newUrl = filter === 'all'
      ? '/admin/orders'
      : `/admin/orders?filter=${filter}`
    window.history.replaceState({}, '', newUrl)
  }, [filter])

  const fetchOrders = async (searchQuery?: string) => {
    try {
      setLoading(true)
      const query = searchQuery !== undefined ? searchQuery : search
      const res = await fetch(`/api/admin/orders?search=${encodeURIComponent(query)}&filter=${filter}&page=${page}`)

      if (res.status === 401) {
        router.push('/admin/login')
        return
      }

      const data = await res.json()
      setOrders(data.orders)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch {
      router.push('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchOrders(search)
  }

  const formatCourse = (course: string) => {
    const colors: Record<string, string> = {
      '5K': 'bg-green-100 text-green-700',
      '10K': 'bg-blue-100 text-blue-700',
      'Half': 'bg-purple-100 text-purple-700'
    }
    return colors[course] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-gray-500 hover:text-gray-700 text-sm">
            ← 대시보드
          </Link>
          <h1 className="text-2xl font-bold mt-2">주문 관리</h1>
          <p className="text-gray-500 text-sm">총 {total}건</p>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="mb-6 space-y-4">
        {/* 필터 버튼 */}
        <div className="flex gap-2 justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => { setFilter('all'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체 주문
            </button>
            <button
              onClick={() => { setFilter('multi'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'multi'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              복수 구매자만
            </button>
          </div>
          <a
            href={`/api/admin/orders/export?filter=${filter}`}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            엑셀 다운로드
          </a>
        </div>

        {/* 검색 */}
        <form onSubmit={handleSearch}>
          <div className="flex gap-2">
            <input
              type="text"
              className="input-field flex-1"
              placeholder="이름, 이메일, 전화번호로 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-primary px-6">
              검색
            </button>
          </div>
        </form>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">구매자</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">이메일</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">연락처</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">코스</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">참가자</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">입력현황</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">금액</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{order.id}</td>
                    <td className="px-4 py-3 font-medium">
                      {order.buyer_name}
                      {order.buyer_gender && (
                        <span className="ml-1 text-xs text-gray-400">
                          ({order.buyer_gender === 'M' ? '남' : '여'})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{order.buyer_email}</td>
                    <td className="px-4 py-3 text-gray-500">{order.buyer_phone}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${formatCourse(order.course)}`}>
                        {order.course}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {order.total_participants}명
                      {order.email_total_participants >= 2 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                          총{order.email_total_participants}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {order.email_total_participants >= 2 ? (
                        <span className={order.email_completed_count === order.email_total_participants ? 'text-green-600' : 'text-yellow-600'}>
                          {order.email_completed_count}/{order.email_total_participants}
                        </span>
                      ) : (
                        <span className={order.completed_count === order.participant_count ? 'text-green-600' : 'text-yellow-600'}>
                          {order.completed_count}/{order.participant_count}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{order.total_amount?.toLocaleString()}원</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}?filter=${filter}`}
                        className="text-primary hover:underline"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center text-gray-500">로딩 중...</div>}>
      <AdminOrdersContent />
    </Suspense>
  )
}
