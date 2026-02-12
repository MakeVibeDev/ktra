#!/bin/bash

# KTRA Form 배포 스크립트
# 사용법: ./deploy.sh [서버IP]

SERVER_IP=${1:-"YOUR_SERVER_IP"}
APP_DIR="/home/ubuntu/ktra-form"

echo "=== KTRA Form 배포 ==="

# 1. 빌드
echo "1. 빌드 중..."
npm run build

# 2. 서버로 파일 전송
echo "2. 서버로 파일 전송..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.next/cache' \
  ./ ubuntu@$SERVER_IP:$APP_DIR/

# 3. 서버에서 설치 및 재시작
echo "3. 서버에서 설치 및 재시작..."
ssh ubuntu@$SERVER_IP << 'EOF'
cd /home/ubuntu/ktra-form
npm install --production
pm2 restart ktra-form || pm2 start npm --name "ktra-form" -- start
EOF

echo "=== 배포 완료 ==="
