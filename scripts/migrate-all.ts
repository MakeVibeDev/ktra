import Database from 'better-sqlite3'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'
import { extractCourse, normalizePhone, parseOptionString } from '../lib/parser'

// 데이터 디렉토리 확인
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// 기존 DB 백업
const dbPath = path.join(dataDir, 'ktra.db')
if (fs.existsSync(dbPath)) {
  const backupPath = path.join(dataDir, `ktra_backup_${Date.now()}.db`)
  fs.copyFileSync(dbPath, backupPath)
  console.log(`기존 DB 백업: ${backupPath}`)
}

// DB 초기화
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

console.log('=== KTRA 전체 데이터 마이그레이션 시작 ===\n')

// 테이블 생성
console.log('1. 테이블 생성...')
db.exec(`
  DROP TABLE IF EXISTS participants;
  DROP TABLE IF EXISTS orders;
  DROP TABLE IF EXISTS sessions;

  CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_email TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT,
    buyer_gender TEXT,
    total_participants INTEGER NOT NULL DEFAULT 1,
    product_name TEXT NOT NULL,
    course TEXT,
    option_raw TEXT,
    recipient_name TEXT,
    recipient_phone TEXT,
    zipcode TEXT,
    address TEXT,
    address_detail TEXT,
    total_amount INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    participant_index INTEGER NOT NULL,
    name TEXT,
    gender TEXT,
    birth_date TEXT,
    phone TEXT,
    course TEXT NOT NULL,
    tshirt_size TEXT,
    emergency_contact TEXT,
    emergency_relation TEXT,
    option_raw TEXT,
    is_primary INTEGER DEFAULT 0,
    is_completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    UNIQUE(order_id, participant_index)
  );

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_orders_email ON orders(buyer_email);
  CREATE INDEX idx_orders_participants ON orders(total_participants);
  CREATE INDEX idx_participants_order ON participants(order_id);
  CREATE INDEX idx_sessions_email ON sessions(email);
`)
console.log('   테이블 생성 완료\n')

// 회원 데이터 읽기 (성별 매핑용)
console.log('2. 회원 데이터 읽기 (성별 매핑용)...')
const memberExcelPath = path.join(process.cwd(), '..', 'data', '0210_주문고객명단_3355명.xls')
const emailGenderMap = new Map<string, string>()

if (fs.existsSync(memberExcelPath)) {
  const memberWorkbook = XLSX.readFile(memberExcelPath)
  const memberSheet = memberWorkbook.Sheets[memberWorkbook.SheetNames[0]]
  const memberData = XLSX.utils.sheet_to_json(memberSheet) as any[]

  for (const member of memberData) {
    const email = member['이메일']?.toLowerCase()?.trim()
    const gender = member['성별']?.trim()
    if (email && gender && (gender === 'M' || gender === 'F')) {
      emailGenderMap.set(email, gender)
    }
  }
  console.log(`   회원 성별 데이터: ${emailGenderMap.size}건\n`)
} else {
  console.log('   회원 데이터 파일 없음 (성별 매핑 스킵)\n')
}

// 주문 엑셀 파일 읽기
console.log('3. 주문 엑셀 파일 읽기...')
const excelPath = path.join(process.cwd(), '..', 'data', '0210_상품주문건_3842.xlsx')

if (!fs.existsSync(excelPath)) {
  console.error(`   엑셀 파일을 찾을 수 없습니다: ${excelPath}`)
  process.exit(1)
}

const workbook = XLSX.readFile(excelPath)
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]
const rawData = XLSX.utils.sheet_to_json(worksheet) as any[]

console.log(`   원본 데이터: ${rawData.length}건\n`)

// 데이터 정제 - 주문 그룹핑
console.log('4. 주문 그룹핑 (금액 기준 + 구매수량 합산)...')

interface ParticipantRow {
  row: any
  quantity: number
  course: string
}

interface OrderGroup {
  primaryRow: any
  participants: ParticipantRow[]
  totalQuantity: number
}

const orderGroups: OrderGroup[] = []
let currentOrder: OrderGroup | null = null

for (const row of rawData) {
  const quantity = row['구매수량'] || 1

  // 금액이 있으면 새 주문 시작
  if (row['최종주문금액'] && row['주문자 이메일']) {
    if (currentOrder) {
      orderGroups.push(currentOrder)
    }
    const course = extractCourse(row['상품명'] || '')
    currentOrder = {
      primaryRow: row,
      participants: [{
        row: row,
        quantity: quantity,
        course: course
      }],
      totalQuantity: quantity
    }
  } else if (currentOrder && !row['최종주문금액']) {
    // 금액이 없으면 추가 참가자 행
    const course = extractCourse(row['상품명'] || '') || currentOrder.participants[0].course
    currentOrder.participants.push({
      row: row,
      quantity: quantity,
      course: course
    })
    currentOrder.totalQuantity += quantity
  }
}

// 마지막 주문 추가
if (currentOrder) {
  orderGroups.push(currentOrder)
}

console.log(`   총 주문 수: ${orderGroups.length}건\n`)

// DB 삽입 (전체 주문)
console.log('5. 전체 주문 DB 삽입...')

const insertOrder = db.prepare(`
  INSERT INTO orders (
    buyer_email, buyer_name, buyer_phone, buyer_gender, total_participants, product_name, course,
    option_raw, recipient_name, recipient_phone, zipcode, address, address_detail, total_amount
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const insertParticipant = db.prepare(`
  INSERT INTO participants (
    order_id, participant_index, name, gender, birth_date, phone, course,
    tshirt_size, emergency_contact, emergency_relation, option_raw, is_primary, is_completed
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

let orderCount = 0
let participantCount = 0

const insertAll = db.transaction(() => {
  for (const group of orderGroups) {
    const row = group.primaryRow
    const totalParticipants = group.totalQuantity

    // 코스 추출
    const course = extractCourse(row['상품명'] || '')

    // 전화번호 정규화
    const buyerPhone = normalizePhone(String(row['수령자 전화번호'] || ''))

    // 이메일에서 성별 가져오기
    const buyerEmail = row['주문자 이메일']?.toLowerCase()?.trim()
    const buyerGender = emailGenderMap.get(buyerEmail) || null

    // 주문 삽입
    const result = insertOrder.run(
      row['주문자 이메일'],
      row['주문자 이름'] || '',
      buyerPhone,
      buyerGender,
      totalParticipants,
      row['상품명'] || '',
      course,
      row['옵션명'] || '',
      row['수령자명'] || '',
      buyerPhone,
      row['배송지 우편번호'] ? String(Math.floor(row['배송지 우편번호'])) : '',
      row['주소'] || '',
      row['상세주소'] || '',
      row['최종주문금액'] ? Math.floor(row['최종주문금액']) : 0
    )

    const orderId = result.lastInsertRowid as number
    orderCount++

    // 참가자 등록 - 각 행의 구매수량만큼 생성
    let participantIndex = 0

    for (const p of group.participants) {
      // 옵션명 파싱
      const parsed = parseOptionString(p.row['옵션명'] || '')

      for (let i = 0; i < p.quantity; i++) {
        const isPrimary = participantIndex === 0 ? 1 : 0
        // 대표 구매자는 옵션 정보가 있으면 완료 처리
        const hasData = parsed.emergencyContact || parsed.tshirtSize
        const isCompleted = isPrimary && hasData ? 1 : 0
        const name = participantIndex === 0 ? (row['주문자 이름'] || '') : null

        insertParticipant.run(
          orderId,
          participantIndex,
          name,
          parsed.gender || (isPrimary ? buyerGender : null),
          parsed.birthDate || null,
          parsed.phone || null,
          p.course,
          parsed.tshirtSize || null,
          parsed.emergencyContact || null,
          parsed.emergencyRelation || null,
          p.row['옵션명'] || '',
          isPrimary,
          isCompleted
        )
        participantCount++
        participantIndex++
      }
    }
  }
})

insertAll()

console.log(`   주문 삽입: ${orderCount}건`)
console.log(`   참가자 삽입: ${participantCount}건\n`)

// 통계
const stats = db.prepare(`
  SELECT
    COUNT(*) as totalOrders,
    SUM(total_participants) as totalParticipants,
    SUM(CASE WHEN total_participants >= 2 THEN 1 ELSE 0 END) as multiOrders
  FROM orders
`).get() as any

const participantStats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
  FROM participants
`).get() as any

// 결과 요약
console.log('=== 마이그레이션 완료 ===')
console.log(`총 주문: ${stats.totalOrders}건`)
console.log(`총 참가자: ${participantStats.total}명`)
console.log(`복수 구매 주문: ${stats.multiOrders}건`)
console.log(`정보 입력 완료: ${participantStats.completed}명`)
console.log(`DB 경로: ${dbPath}`)

db.close()
