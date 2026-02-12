import Database from 'better-sqlite3'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'

// DB 연결
const dbPath = path.join(process.cwd(), 'data', 'ktra.db')
if (!fs.existsSync(dbPath)) {
  console.error('DB 파일을 찾을 수 없습니다:', dbPath)
  process.exit(1)
}

const db = new Database(dbPath)

console.log('=== orders 테이블 구매자 성별 매핑 시작 ===\n')

// 1. buyer_gender 컬럼 추가 (없으면)
console.log('1. orders 테이블에 buyer_gender 컬럼 추가...')
try {
  db.exec(`ALTER TABLE orders ADD COLUMN buyer_gender TEXT`)
  console.log('   buyer_gender 컬럼 추가 완료\n')
} catch (e: any) {
  if (e.message.includes('duplicate column')) {
    console.log('   buyer_gender 컬럼이 이미 존재합니다\n')
  } else {
    throw e
  }
}

// 회원 엑셀 파일 읽기
console.log('2. 회원 데이터 읽기...')
const memberExcelPath = path.join(process.cwd(), '..', 'data', '0210_주문고객명단_3355명.xls')

if (!fs.existsSync(memberExcelPath)) {
  console.error(`   회원 엑셀 파일을 찾을 수 없습니다: ${memberExcelPath}`)
  process.exit(1)
}

const workbook = XLSX.readFile(memberExcelPath)
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]
const memberData = XLSX.utils.sheet_to_json(worksheet) as any[]

console.log(`   회원 데이터: ${memberData.length}건\n`)

// 이메일 → 성별 맵 생성
console.log('3. 이메일-성별 맵 생성...')
const emailGenderMap = new Map<string, string>()

for (const member of memberData) {
  const email = member['이메일']?.toLowerCase()?.trim()
  const gender = member['성별']?.trim()

  if (email && gender && (gender === 'M' || gender === 'F')) {
    emailGenderMap.set(email, gender)
  }
}

console.log(`   유효한 성별 데이터: ${emailGenderMap.size}건\n`)

// 성별 분포 확인
let maleCount = 0
let femaleCount = 0
for (const gender of emailGenderMap.values()) {
  if (gender === 'M') maleCount++
  else if (gender === 'F') femaleCount++
}
console.log(`   남성: ${maleCount}명, 여성: ${femaleCount}명\n`)

// orders 테이블 buyer_gender 업데이트
console.log('4. orders 테이블 buyer_gender 업데이트...')

const orders = db.prepare(`
  SELECT id, buyer_email
  FROM orders
`).all() as { id: number; buyer_email: string }[]

console.log(`   주문 수: ${orders.length}건`)

const updateGender = db.prepare(`
  UPDATE orders SET buyer_gender = ? WHERE id = ?
`)

let updatedCount = 0
let notFoundCount = 0

const updateAll = db.transaction(() => {
  for (const order of orders) {
    const email = order.buyer_email?.toLowerCase()?.trim()
    const gender = emailGenderMap.get(email)

    if (gender) {
      updateGender.run(gender, order.id)
      updatedCount++
    } else {
      notFoundCount++
    }
  }
})

updateAll()

console.log(`   성별 업데이트 완료: ${updatedCount}건`)
console.log(`   매칭 실패: ${notFoundCount}건\n`)

// 결과 확인
console.log('5. 업데이트 결과 확인...')
const stats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN buyer_gender IS NOT NULL THEN 1 ELSE 0 END) as has_gender,
    SUM(CASE WHEN buyer_gender = 'M' THEN 1 ELSE 0 END) as male,
    SUM(CASE WHEN buyer_gender = 'F' THEN 1 ELSE 0 END) as female
  FROM orders
`).get() as { total: number; has_gender: number; male: number; female: number }

console.log(`   주문 총: ${stats.total}건`)
console.log(`   성별 매핑 완료: ${stats.has_gender}건`)
console.log(`   남성: ${stats.male}건, 여성: ${stats.female}건`)

// 매칭 실패한 이메일 샘플 출력
if (notFoundCount > 0) {
  console.log('\n6. 매칭 실패 이메일 샘플 (최대 5개)...')
  const notMatched = orders
    .filter(o => !emailGenderMap.has(o.buyer_email?.toLowerCase()?.trim()))
    .slice(0, 5)

  for (const o of notMatched) {
    console.log(`   - ${o.buyer_email}`)
  }
}

console.log('\n=== orders 테이블 성별 매핑 완료 ===')

db.close()
