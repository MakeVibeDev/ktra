import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'ktra.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
  }
  return db
}

export function initDb() {
  const db = getDb()

  // 주문 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_email TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      buyer_phone TEXT,
      quantity INTEGER NOT NULL,
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
    )
  `)

  // 참가자 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
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
      is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      UNIQUE(order_id, participant_index)
    )
  `)

  // 세션 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 인덱스 생성
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(buyer_email);
    CREATE INDEX IF NOT EXISTS idx_orders_quantity ON orders(quantity);
    CREATE INDEX IF NOT EXISTS idx_participants_order ON participants(order_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email);
  `)

  console.log('Database initialized successfully')
}

// 주문 조회 함수들
export function findOrdersByBuyerIdAndPhone(buyerId: string, phone: string) {
  const db = getDb()
  const normalizedPhone = phone.replace(/-/g, '')

  // buyer_id 기준으로 모든 주문 반환 (복수 구매자만 DB에 저장됨)
  return db.prepare(`
    SELECT * FROM orders
    WHERE LOWER(buyer_id) = LOWER(?)
    AND (
      REPLACE(buyer_phone, '-', '') LIKE ?
      OR REPLACE(recipient_phone, '-', '') LIKE ?
    )
  `).all(buyerId, `%${normalizedPhone}%`, `%${normalizedPhone}%`)
}

// buyer_id로만 주문 조회 (전화번호 없이)
export function findOrdersByBuyerId(buyerId: string) {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM orders
    WHERE LOWER(buyer_id) = LOWER(?)
    ORDER BY id
  `).all(buyerId)
}

export function findOrderById(id: number) {
  const db = getDb()
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
}

export function findParticipantsByOrderId(orderId: number) {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM participants
    WHERE order_id = ?
    ORDER BY participant_index
  `).all(orderId)
}

export function upsertParticipant(data: {
  orderId: number
  participantIndex: number
  name: string
  gender: string
  birthDate: string
  phone: string
  course: string
  tshirtSize: string
  emergencyContact: string
  emergencyRelation: string
}) {
  const db = getDb()
  const now = new Date().toISOString()

  return db.prepare(`
    INSERT INTO participants
    (order_id, participant_index, name, gender, birth_date, phone, course, tshirt_size, emergency_contact, emergency_relation, is_completed, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(order_id, participant_index)
    DO UPDATE SET
      name = excluded.name,
      gender = excluded.gender,
      birth_date = excluded.birth_date,
      phone = excluded.phone,
      tshirt_size = excluded.tshirt_size,
      emergency_contact = excluded.emergency_contact,
      emergency_relation = excluded.emergency_relation,
      is_completed = 1,
      updated_at = ?
  `).run(
    data.orderId,
    data.participantIndex,
    data.name,
    data.gender,
    data.birthDate,
    data.phone,
    data.course,
    data.tshirtSize,
    data.emergencyContact,
    data.emergencyRelation,
    now,
    now,
    now
  )
}

// 세션 관련 함수
export function createSession(email: string, phone: string): string {
  const db = getDb()
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  db.prepare(`
    INSERT INTO sessions (id, email, phone, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(id, email, phone, expiresAt)

  return id
}

export function validateSession(sessionId: string) {
  const db = getDb()
  const session = db.prepare(`
    SELECT * FROM sessions
    WHERE id = ? AND expires_at > datetime('now')
  `).get(sessionId) as { id: string; email: string; phone: string } | undefined

  return session
}

export function deleteExpiredSessions() {
  const db = getDb()
  db.prepare(`DELETE FROM sessions WHERE expires_at <= datetime('now')`).run()
}
