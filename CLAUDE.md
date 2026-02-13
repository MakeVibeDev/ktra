# KTRA 프로젝트

## 서버 접속 정보
- **IP**: 133.186.218.221
- **User**: ubuntu
- **SSH Key**: /Users/gaejoon/.ssh/key-ktra-live.pem
- **앱 경로**: /home/ubuntu/ktra-form
- **DB 경로**: /home/ubuntu/ktra-form/data/ktra.db
- **PM2 앱명**: ktra-form

### 배포 명령어
```bash
# DB 배포
scp -i /Users/gaejoon/.ssh/key-ktra-live.pem /Users/gaejoon/MakeVibe/Projects/ktra/ktra-form/data/ktra.db ubuntu@133.186.218.221:/home/ubuntu/ktra-form/data/ktra.db

# PM2 재시작
ssh -i /Users/gaejoon/.ssh/key-ktra-live.pem ubuntu@133.186.218.221 "cd /home/ubuntu/ktra-form && pm2 restart ktra-form"

# 서버 접속
ssh -i /Users/gaejoon/.ssh/key-ktra-live.pem ubuntu@133.186.218.221
```

### ⚠️ 배포 규칙 (필수)
- **서버 배포 전 반드시 사용자 허락을 받을 것**
- 라이브 서비스 운영 중이므로 신중하게 진행
- 로컬 테스트 완료 후 배포 요청

## 프로젝트 구조
- 로컬 경로: /Users/gaejoon/MakeVibe/Projects/ktra/ktra-form
- GitHub: https://github.com/MakeVibeDev/ktra.git
- 도메인: order.ktra.kr

## DB 테이블
| 테이블 | 설명 | 건수 |
|--------|------|------|
| orders | 전체 주문 | 3,842건 |
| participants | 참가자 | 4,287명 |
| members_591 | 복수구매자 회원 (70,000원 이상) | 591명 |
| members_3355 | 전체 주문 회원 | 3,355명 |
| sessions | 로그인 세션 | - |

## 가격 구조
| 코스 | 단가 |
|------|------|
| 5K | 35,000원 |
| 10K | 40,000원 |
| Half(하프) | 50,000원 |

---

## 데이터 마이그레이션 케이스

### 원본 엑셀 파일
- `/Users/gaejoon/MakeVibe/Projects/ktra/data/개인접수1차_20260212143309.xlsx`
- 컬럼: A(최종주문금액), B(주문자이름), C(주문자이메일), D(구매수량), E(상품명), F(옵션명), G(수령자명), H(수령자전화번호), I(배송지우편번호), J(주소), K(주문자id)

### 엑셀 데이터 구조
```
- 최종주문금액이 있는 행 = 새 주문 (대표 참가자)
- 최종주문금액이 없는 행 = 추가 참가자 (이전 주문에 속함)
- 각 행의 상품명(E열)에서 개별 코스 정보 추출
```

### 마이그레이션 핵심 로직

#### 1. 참가자 수 계산 (금액 기반)
- `구매수량` 컬럼 사용 X (신뢰할 수 없음)
- `총금액 / 단가`로 계산
- 예: 5K 70,000원 = 2명, 5K+Half 85,000원 = 2명

#### 2. 코스 정보 추출
- 상품명에서 추출: `5K`, `10K`, `하프/Half`
- **주의**: 추가 참가자(금액 없는 행)는 자신의 행의 상품명에서 코스 추출
- 한 주문에 다른 코스 참가자 가능 (예: 5K + Half)

#### 3. 연락처(buyer_phone) 추출
- option_raw에서 파싱: `연락처 (ex. 010-1234-5678) : 010-xxxx-xxxx`
- 정규화: 숫자만 추출, 10자리면 앞에 0 추가

#### 4. 배송지 정보
- G열: 수령자명 → recipient_name
- H열: 수령자 전화번호 → recipient_phone
- I열: 우편번호 → zipcode (문자열로 저장, 앞자리 0 보존)
- J열: 주소 → address

#### 5. 성별 정보
- members_3355 테이블에서 buyer_id 매핑
- orders.buyer_gender에 저장 (M/F)

### 마이그레이션 수정 이력

| 날짜 | 이슈 | 해결 |
|------|------|------|
| 2026-02-12 | buyer_email 대신 buyer_id 기준 그룹핑 | 로그인/API 수정 |
| 2026-02-12 | 연락처 누락 | option_raw에서 파싱 |
| 2026-02-12 | 배송지 정보 누락 | G~J열 매핑 |
| 2026-02-12 | 참가자 수 오류 (구매수량 신뢰 X) | 금액 기반 계산 |
| 2026-02-12 | 코스 정보 NULL | product_name에서 추출 |
| 2026-02-12 | 다른 코스 참가자 미반영 | 추가 참가자 행의 개별 코스 적용 |

### 특이 케이스
- 연락처 없는 2건 (ID: 1291, 3008) - 원본에 URL 입력됨
- 성별 없는 14건 - members_3355에 없는 buyer_id
- 다른 코스 추가 참가자 18건 - 5K+Half 등 복합 주문

## Admin 로그인
- URL: https://order.ktra.kr/admin/login
- ID: admin
- PW: ktra2026! (소문자 k)

## 로그인 로직
- buyer_id (회원 아이디) + 전화번호로 인증
- buyer_email이 아닌 buyer_id 기준으로 주문 그룹핑

## DB 백업
- 스크립트: `/home/ubuntu/ktra-form/scripts/backup-db.sh`
- 백업 경로: `/home/ubuntu/ktra-form/data/backups/`
- 스케줄: 매일 06:00, 18:00 (crontab)
- 보관 기간: 7일 (자동 삭제)
- 로그: `/home/ubuntu/ktra-form/logs/backup.log`

---

## 어드민 기능 (2026-02-12 업데이트)

### 주문 관리 페이지 (`/admin/orders`)
- **복수 구매자 대시보드**: 총 인원, 참가자 수, 입력 완료, 완료율(%) 표시
- **필터 기능**: 전체 주문 / 복수 구매자만
- **복수 구매자 필터**: buyer_id별 그룹화하여 주문건수, 참가자수, 입력현황 합산 표시
- **페이지당 개수 선택**: 20/50/100/200개
- **입력현황**: 주문별 개별 표시 (합산 X)

### 주문 상세 페이지 (`/admin/orders/[id]`)
- 주문 정보 수정 가능: 구매자명, 성별, 이메일, 연락처, 코스, **금액**, **참가자수**, 배송지
- 참가자수 변경 시 `participants` 테이블 자동 동기화
  - 감소: 뒤에서부터 삭제
  - 증가: 새 레코드 자동 생성
- 참가자별 정보 수정: 이름, 성별, 생년월일, 연락처, 코스, 티셔츠 사이즈, 비상연락처

### 복수 구매자 현황
- 총 복수 구매자: 598명 (buyer_id별 총 금액 >= 70,000원)
- 기존 members_591 + 신규 7명

### 주문 추가 방법
신규 주문 1건 추가 시 스크립트 사용:
```bash
# scripts/add-one-order.js 수정 후 실행
node scripts/add-one-order.js
```

### 주문 취소 기능 (2026-02-13 추가)
- **DB 필드**: `is_cancelled` (0/1), `cancelled_at` (timestamp)
- **취소 시**: 금액 50% 차감 후 저장
- **어드민**: 체크박스로 선택 후 "선택 취소" 버튼
- **사용자 화면**: 취소된 주문은 입력 리스트에서 제외
- **API**: `/api/admin/orders/cancel` (POST, orderIds 배열)

### 로컬 DB 경로
- `/Users/gaejoon/MakeVibe/Projects/ktra/ktra-form/data/ktra.db`
- 작업 시 반드시 `ktra-form` 폴더에서 실행할 것
