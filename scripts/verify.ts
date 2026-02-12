import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'ktra.db')
const db = new Database(dbPath, { readonly: true })

console.log('=== KTRA 데이터 검증 ===\n')

// 1. 주문 데이터 검증
const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number }
const multiOrderCount = db.prepare('SELECT COUNT(*) as count FROM orders WHERE quantity >= 2').get() as { count: number }
const participantCount = db.prepare('SELECT COUNT(*) as count FROM participants').get() as { count: number }

console.log('1. 기본 통계')
console.log(`   총 주문 수: ${orderCount.count}건`)
console.log(`   복수 구매자: ${multiOrderCount.count}명`)
console.log(`   참가자 레코드: ${participantCount.count}건`)
console.log()

// 2. 코스별 분포
console.log('2. 코스별 분포')
const courseDistribution = db.prepare(`
  SELECT course, COUNT(*) as count
  FROM orders
  GROUP BY course
  ORDER BY count DESC
`).all() as { course: string; count: number }[]

for (const row of courseDistribution) {
  console.log(`   ${row.course || '(없음)'}: ${row.count}건`)
}
console.log()

// 3. 구매수량별 분포
console.log('3. 구매수량별 분포')
const quantityDistribution = db.prepare(`
  SELECT quantity, COUNT(*) as count
  FROM orders
  GROUP BY quantity
  ORDER BY quantity
`).all() as { quantity: number; count: number }[]

for (const row of quantityDistribution) {
  console.log(`   ${row.quantity}개: ${row.count}건`)
}
console.log()

// 4. 참가자 입력 상태
console.log('4. 참가자 입력 상태')
const completedCount = db.prepare('SELECT COUNT(*) as count FROM participants WHERE is_completed = 1').get() as { count: number }
const pendingCount = db.prepare('SELECT COUNT(*) as count FROM participants WHERE is_completed = 0').get() as { count: number }

console.log(`   입력 완료: ${completedCount.count}건`)
console.log(`   입력 대기: ${pendingCount.count}건`)
console.log()

// 5. 샘플 복수 구매자 데이터
console.log('5. 샘플 복수 구매자 (상위 5명)')
const sampleMultiOrders = db.prepare(`
  SELECT buyer_email, buyer_name, quantity, course, total_amount
  FROM orders
  WHERE quantity >= 2
  ORDER BY quantity DESC
  LIMIT 5
`).all() as any[]

for (const order of sampleMultiOrders) {
  console.log(`   ${order.buyer_name} (${order.buyer_email})`)
  console.log(`      - 수량: ${order.quantity}개, 코스: ${order.course}, 금액: ${order.total_amount?.toLocaleString()}원`)
}
console.log()

// 6. 데이터 무결성 검사
console.log('6. 데이터 무결성 검사')
const orphanParticipants = db.prepare(`
  SELECT COUNT(*) as count FROM participants p
  LEFT JOIN orders o ON p.order_id = o.id
  WHERE o.id IS NULL
`).get() as { count: number }

const expectedParticipants = db.prepare(`
  SELECT SUM(quantity - 1) as expected FROM orders WHERE quantity >= 2
`).get() as { expected: number }

console.log(`   고아 참가자 레코드: ${orphanParticipants.count}건`)
console.log(`   예상 참가자 수: ${expectedParticipants.expected}건`)
console.log(`   실제 참가자 수: ${participantCount.count}건`)
console.log(`   일치 여부: ${expectedParticipants.expected === participantCount.count ? '✅ OK' : '❌ 불일치'}`)

db.close()
