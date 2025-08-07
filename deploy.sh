#!/bin/bash

# デプロイスクリプト for my-ai-chat
echo "🚀 Starting deployment of My AI Chat application..."

# 既存のコンテナを停止・削除
echo "📦 Stopping existing containers..."
docker-compose down

# 既存のイメージを削除（オプション）
echo "🧹 Cleaning up old images..."
docker-compose down --rmi all --volumes --remove-orphans

# Next.jsキャッシュをクリア
echo "🧹 Clearing Next.js cache..."
docker system prune -f

# 新しいイメージをビルド
echo "🔨 Building new images..."
docker-compose build --no-cache --pull

# コンテナを起動
echo "🎬 Starting containers..."
docker-compose up -d

# コンテナの状態を確認
echo "📋 Checking container status..."
docker-compose ps

# Ollamaサーバーが起動するまで待機
echo "⏳ Waiting for Ollama server to start..."
sleep 10

# アプリケーションの動作確認
echo "🔍 Testing application health..."
if curl -f http://localhost:65000 > /dev/null 2>&1; then
    echo "✅ Next.js app is running at http://localhost:65000"
else
    echo "❌ Next.js app failed to start"
fi

if curl -f http://localhost:65434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama server is running at http://localhost:65434"
else
    echo "❌ Ollama server failed to start or is not ready yet"
fi

echo ""
echo "🎉 Deployment completed!"
echo "📱 Access your application at: http://localhost:65000"
echo "🤖 Ollama API available at: http://localhost:65434"
echo ""
echo "📝 To view logs:"
echo "   docker-compose logs -f nextjs"
echo "   docker-compose logs -f ollama"
echo ""
echo "🛑 To stop the application:"
echo "   docker-compose down"