# Ollama Chat

Next.jsとAI SDKを使用してOllamaと連携するシンプルなチャットアプリケーションです。

## 必要な環境

- Docker & Docker Compose

## Dockerでのセットアップ（推奨）

1. リポジトリをクローン
```bash
git clone <repository-url>
cd my-ai-chat
```

2. Dockerコンテナを起動
```bash
docker-compose up -d
```

3. OllamaコンテナにLLMモデルをインストール
```bash
# 利用可能なモデル一覧を確認
docker exec my-ai-chat-ollama-1 ollama list

# モデルをインストール（例：軽量なTinyLlama）
docker exec my-ai-chat-ollama-1 ollama pull tinyllama:latest

# 日本語対応モデル
docker exec my-ai-chat-ollama-1 ollama pull dsasai/llama3-elyza-jp-8b:latest

# その他のモデル
docker exec my-ai-chat-ollama-1 ollama pull gemma2:2b
docker exec my-ai-chat-ollama-1 ollama pull mistral:latest
docker exec my-ai-chat-ollama-1 ollama pull llama2:latest
```

4. アプリケーションにアクセス
ブラウザで `http://localhost:13000` を開いてチャットを開始できます。

### ローカル開発環境でのセットアップ

1. 依存関係をインストール
```bash
npm install
```

2. 開発サーバーを起動
```bash
npm run dev
```

3. ブラウザで `http://localhost:3000` を開く

## Docker管理コマンド

```bash
# コンテナの起動
docker-compose up -d

# コンテナの停止
docker-compose down

# ログの確認
docker-compose logs

# コンテナの状態確認
docker-compose ps

# Ollamaモデルの管理
docker exec my-ai-chat-ollama-1 ollama list        # インストール済みモデル
docker exec my-ai-chat-ollama-1 ollama rm <model>  # モデル削除
```

## 利用可能なコマンド

- `npm run dev` - 開発サーバー起動 (Next.js)
- `npm run build` - プロダクション用ビルド
- `npm run start` - プロダクションサーバー起動
- `npm run lint` - ESLintチェック

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **AI統合**: AI SDK (@ai-sdk/react, @ai-sdk/openai)
- **LLMプロバイダー**: Ollama
- **デプロイ**: Docker & Docker Compose

## アーキテクチャ

### コア構造
- **フロントエンド**: React + AI SDK (`@ai-sdk/react`) の`useChat`フックでストリーミングチャットインターフェース
- **バックエンド**: Next.js API Route (`/api/chat`) でローカルOllamaからのストリーミング応答を処理
- **スタイリング**: Tailwind CSS（最小限のカスタムスタイリング）
- **AI統合**: Ollama（`http://localhost:11434/v1`）に接続する`@ai-sdk/openai`を使用

### 重要なファイル
- `app/page.tsx` - `useChat`フックを使用するメインチャットインターフェース
- `app/api/chat/route.ts` - OllamaへのリクエストをプロキシするAPIエンドポイント
- `app/layout.tsx` - Interフォントとメタデータを含むルートレイアウト

### チャットフロー
1. フロントエンドの`useChat`フックでユーザー入力を処理
2. `/api/chat`エンドポイントにメッセージを送信
3. バックエンドが`streamText`を使用してOllamaからの応答をストリーミング
4. フロントエンドがローディング状態とエラーハンドリングでストリーミング応答を表示

## 設定

アプリケーションの設定：

- **Next.jsポート**: 13000
- **Ollamaポート**: 11434  
- **Ollama URL**: `http://ollama:11434` (コンテナ間通信)
- **デフォルトモデル**: gemma3
- **API Key**: "ollama" (ローカル環境用ダミー値)

### ローカル開発環境の要件
- Ollamaがポート11434でローカルに実行されている必要があります
- gemma3モデルが利用可能である必要があります  
- アプリはOllamaのOpenAI互換APIエンドポイント（`http://localhost:11434/v1`）を期待します

設定を変更する場合は `app/api/chat/route.ts` を編集してください。