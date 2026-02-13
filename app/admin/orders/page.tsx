'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Order {
  id: number
  buyer_name: string
  buyer_email: string
  buyer_id: string
  buyer_phone: string
  buyer_gender: string
  course: string
  total_participants: number
  total_amount: number
  participant_count: number
  completed_count: number
  buyer_total_participants: number
  buyer_completed_count: number
  is_cancelled: number
}

interface MultiBuyer {
  buyer_id: string
  buyer_name: string
  buyer_phone: string
  buyer_gender: string
  order_count: number
  total_participants: number
  total_amount: number
  courses: string
  completed_count: number
}

interface Stats {
  total_buyers: number
  total_participants: number
  completed_participants: number
}

function AdminOrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [multiBuyers, setMultiBuyers] = useState<MultiBuyer[]>([])
  const [mode, setMode] = useState<'all' | 'multi'>('all')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [page, filter, limit])

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
      const res = await fetch(`/api/admin/orders?search=${encodeURIComponent(query)}&filter=${filter}&page=${page}&limit=${limit}`)

      if (res.status === 401) {
        router.push('/admin/login')
        return
      }

      const data = await res.json()
      setMode(data.mode)
      setStats(data.stats)

      if (data.mode === 'multi') {
        setMultiBuyers(data.buyers)
        setOrders([])
      } else {
        setOrders(data.orders)
        setMultiBuyers([])
      }

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

  const handleSelectOrder = (orderId: number) => {
    setSelectedIds(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleSelectAll = () => {
    if (selectedIds.length === orders.filter(o => !o.is_cancelled).length) {
      setSelectedIds([])
    } else {
      setSelectedIds(orders.filter(o => !o.is_cancelled).map(o => o.id))
    }
  }

  const handleCancelSelected = async () => {
    if (selectedIds.length === 0) {
      alert('취소할 주문을 선택해주세요.')
      return
    }

    const selectedOrders = orders.filter(o => selectedIds.includes(o.id))
    const totalAmount = selectedOrders.reduce((sum, o) => sum + o.total_amount, 0)
    const newAmount = Math.floor(totalAmount * 0.5)

    if (!confirm(`선택한 ${selectedIds.length}건을 취소하시겠습니까?\n\n현재 금액: ${totalAmount.toLocaleString()}원\n취소 후 금액: ${newAmount.toLocaleString()}원 (50% 차감)`)) {
      return
    }

    setCancelling(true)
    try {
      const res = await fetch('/api/admin/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedIds })
      })

      if (res.ok) {
        const data = await res.json()
        alert(`${data.cancelled}건 취소 완료`)
        setSelectedIds([])
        fetchOrders()
      } else {
        const error = await res.json()
        alert(error.error || '취소 실패')
      }
    } catch {
      alert('취소 중 오류가 발생했습니다.')
    } finally {
      setCancelling(false)
    }
  }

  const completionRate = stats && stats.total_participants > 0
    ? Math.round((stats.completed_participants / stats.total_participants) * 100)
    : 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-gray-500 hover:text-gray-700 text-sm">
            ← 대시보드
          </Link>
          <h1 className="text-2xl font-bold mt-2">주문 관리</h1>
          <p className="text-gray-500 text-sm">
            {mode === 'multi' ? `복수 구매자 ${total}명` : `총 ${total}건`}
          </p>
        </div>
      </div>

      {/* 복수 구매자 입력 현황 대시보드 */}
      {stats && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-6 border border-purple-100">
          <h2 className="text-sm font-medium text-gray-600 mb-4">복수 구매자 입력 현황</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-2xl font-bold text-gray-800">{stats.total_buyers}명</p>
              <p className="text-xs text-gray-500">복수 구매자</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-2xl font-bold text-gray-800">{stats.total_participants}명</p>
              <p className="text-xs text-gray-500">총 참가자</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-2xl font-bold text-green-600">{stats.completed_participants}명</p>
              <p className="text-xs text-gray-500">입력 완료</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-primary">{completionRate}%</p>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">완료율</p>
            </div>
          </div>
        </div>
      )}

      {/* 필터 및 검색 */}
      <div className="mb-6 space-y-4">
        {/* 필터 버튼 */}
        <div className="flex gap-2 justify-between items-center">
          <div className="flex gap-2 items-center">
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
            <span className="text-gray-300 mx-2">|</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white"
            >
              <option value={20}>20개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
              <option value={200}>200개</option>
            </select>
          </div>
          <div className="flex gap-2">
            {mode === 'all' && selectedIds.length > 0 && (
              <button
                onClick={handleCancelSelected}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancelling ? '처리중...' : `선택 취소 (${selectedIds.length}건)`}
              </button>
            )}
            <a
              href={`/api/admin/orders/export?filter=${filter}`}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              엑셀 다운로드
            </a>
          </div>
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
          {mode === 'multi' ? (
            /* 복수 구매자 테이블 */
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">구매자</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">이메일(ID)</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">연락처</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">코스</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">주문</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">참가자</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">입력현황</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">총금액</th>
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
                ) : multiBuyers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  multiBuyers.map((buyer) => (
                    <tr key={buyer.buyer_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {buyer.buyer_name}
                        {buyer.buyer_gender && (
                          <span className="ml-1 text-xs text-gray-400">
                            ({buyer.buyer_gender === 'M' ? '남' : '여'})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{buyer.buyer_id}</td>
                      <td className="px-4 py-3 text-gray-500">{buyer.buyer_phone}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {buyer.courses?.split(',').map((course, idx) => (
                            <span key={idx} className={`px-2 py-0.5 rounded text-xs font-medium ${formatCourse(course)}`}>
                              {course}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-600">{buyer.order_count}건</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-primary">{buyer.total_participants}명</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={buyer.completed_count === buyer.total_participants ? 'text-green-600 font-medium' : 'text-yellow-600'}>
                          {buyer.completed_count}/{buyer.total_participants}
                        </span>
                        {buyer.completed_count === buyer.total_participants && (
                          <span className="ml-1 text-green-500">✓</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{buyer.total_amount?.toLocaleString()}원</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders?search=${encodeURIComponent(buyer.buyer_id)}&filter=all`}
                          onClick={(e) => {
                            e.preventDefault()
                            setSearch(buyer.buyer_id)
                            setFilter('all')
                            setPage(1)
                            fetchOrders(buyer.buyer_id)
                          }}
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
          ) : (
            /* 전체 주문 테이블 */
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === orders.filter(o => !o.is_cancelled).length}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">구매자</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">이메일</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">연락처</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">코스</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">참가자</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">입력현황</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">금액</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                      로딩 중...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className={`hover:bg-gray-50 ${order.is_cancelled ? 'bg-red-50 opacity-60' : ''}`}>
                      <td className="px-4 py-3 text-center">
                        {!order.is_cancelled && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(order.id)}
                            onChange={() => handleSelectOrder(order.id)}
                            className="w-4 h-4"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">{order.id}</td>
                      <td className="px-4 py-3 font-medium">
                        {order.buyer_name}
                        {order.buyer_gender && (
                          <span className="ml-1 text-xs text-gray-400">
                            ({order.buyer_gender === 'M' ? '남' : '여'})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{order.buyer_id || order.buyer_email}</td>
                      <td className="px-4 py-3 text-gray-500">{order.buyer_phone}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${formatCourse(order.course)}`}>
                          {order.course}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {order.total_participants}명
                        {order.buyer_total_participants && order.buyer_total_participants >= 2 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                            총{order.buyer_total_participants}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={order.completed_count === order.participant_count ? 'text-green-600' : 'text-yellow-600'}>
                          {order.completed_count}/{order.participant_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">{order.total_amount?.toLocaleString()}원</td>
                      <td className="px-4 py-3">
                        {order.is_cancelled ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                            취소
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                            정상
                          </span>
                        )}
                      </td>
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
          )}
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
