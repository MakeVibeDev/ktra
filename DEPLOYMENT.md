# KTRA 참가자 정보 입력 시스템

## 서비스 정보

| 항목 | 내용 |
|------|------|
| 도메인 | https://order.ktra.kr |
| 서버 IP | 133.186.218.221 |
| 호스팅 | NHN Cloud |
| SSL | Let's Encrypt (자동 갱신, 2026-05-12 만료) |

---

## 관리자 로그인

| 항목 | 내용 |
|------|------|
| URL | https://order.ktra.kr/admin/login |
| ID | `admin` |
| PW | `ktra2026!` |

---

## 주문 데이터 현황

| 항목 | 건수 |
|------|------|
| 총 주문 | 3,841건 |
| 유니크 이메일 (구매자) | 3,440명 |
| 복수 구매자 (이메일별 총 참가자 >= 2) | 541명 |
| 총 참가자 | 4,275명 |
| 본인 (입력 완료) | 3,440명 |
| 추가 참가자 (입력 필요) | 835명 |

> **참고**: 같은 이메일로 여러 주문한 경우, 첫 번째 주문의 첫 번째 참가자만 본인이고 나머지는 모두 추가 참가자로 처리

---

## 서버 접속

```bash
ssh -i ~/.ssh/key-ktra-live.pem ubuntu@133.186.218.221
```

---

## 재배포 방법

```bash
# 로컬에서
cd /Users/gaejoon/MakeVibe/Projects/ktra/ktra-form

# 빌드
npm run build

# 서버로 배포
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.next/cache' \
  -e "ssh -i ~/.ssh/key-ktra-live.pem" \
  ./ ubuntu@133.186.218.221:/home/ubuntu/ktra-form/

# 서버에서 재시작
ssh -i ~/.ssh/key-ktra-live.pem ubuntu@133.186.218.221 "pm2 restart ktra-form"
```

---

## 주요 파일 경로

| 파일 | 경로 |
|------|------|
| 원본 주문 데이터 | `/Users/gaejoon/MakeVibe/Projects/ktra/data/0210_상품주문건_3842.xlsx` |
| 원본 회원 데이터 | `/Users/gaejoon/MakeVibe/Projects/ktra/data/0210_주문고객명단_3355명.xls` |
| 로컬 DB | `/Users/gaejoon/MakeVibe/Projects/ktra/ktra-form/data/ktra.db` |
| 서버 DB | `/home/ubuntu/ktra-form/data/ktra.db` |
| SSH 키 | `~/.ssh/key-ktra-live.pem` |

---

## 데이터 재마이그레이션

```bash
cd /Users/gaejoon/MakeVibe/Projects/ktra/ktra-form
npx tsx scripts/migrate-all.ts
```

---

## 기술 스택

- Next.js 14 (App Router)
- Tailwind CSS
- SQLite (better-sqlite3)
- PM2
- Nginx
- Let's Encrypt SSL
