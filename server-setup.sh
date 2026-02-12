#!/bin/bash

# NHN Cloud 서버 초기 설정 스크립트
# 서버에서 실행: curl -sL [이 파일 URL] | bash

echo "=== KTRA Form 서버 설정 ==="

# 1. Node.js 18 설치
echo "1. Node.js 설치..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. PM2 설치
echo "2. PM2 설치..."
sudo npm install -g pm2

# 3. nginx 설치
echo "3. nginx 설치..."
sudo apt-get install -y nginx

# 4. 앱 디렉토리 생성
echo "4. 앱 디렉토리 생성..."
mkdir -p /home/ubuntu/ktra-form

# 5. nginx 설정
echo "5. nginx 설정..."
sudo tee /etc/nginx/sites-available/ktra-form > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/ktra-form /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 6. PM2 자동시작 설정
echo "6. PM2 자동시작 설정..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "=== 서버 설정 완료 ==="
echo "이제 deploy.sh를 실행하여 앱을 배포하세요."
