#!/bin/bash

# バージョン付きデプロイスクリプト
VERSION=$(date +"%Y%m%d_%H%M%S")
PORT=${1:-8888}

echo "🚀 Deploying My AI Chat v${VERSION} on port ${PORT}..."

# 環境変数でバージョンとポートを設定
export APP_VERSION="${VERSION}"
export EXTERNAL_PORT="${PORT}"

# docker-compose.ymlを動的に生成
cat > docker-compose.override.yml << EOF
version: '3.8'
services:
  nextjs:
    ports:
      - "${EXTERNAL_PORT}:8888"
    environment:
      - APP_VERSION=${APP_VERSION}
      - BUILD_TIME=$(date -Iseconds)
    labels:
      - "version=${APP_VERSION}"
      - "deployed_at=$(date -Iseconds)"
EOF

# 既存のコンテナを停止
echo "📦 Stopping existing containers..."
docker-compose -f docker-compose.yml -f docker-compose.override.yml down

# クリーンアップ
echo "🧹 Cleaning up..."
docker-compose -f docker-compose.yml -f docker-compose.override.yml down --rmi all --volumes --remove-orphans
docker system prune -f

# ビルド
echo "🔨 Building version ${VERSION}..."
docker-compose -f docker-compose.yml -f docker-compose.override.yml build --no-cache --pull

# 起動
echo "🎬 Starting containers on port ${PORT}..."
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# 動作確認
echo "🔍 Testing deployment..."
sleep 5
if curl -f "http://localhost:${PORT}" > /dev/null 2>&1; then
    echo "✅ App deployed successfully at http://localhost:${PORT}"
    echo "📊 Version: ${VERSION}"
else
    echo "❌ Deployment failed"
    exit 1
fi

# クリーンアップ
rm -f docker-compose.override.yml

echo "🎉 Deployment completed!"