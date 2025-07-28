# Ollama Chat

Next.jsとAI SDKを使用してOllamaと連携するシンプルなチャットアプリケーションです。

## 必要な環境

- Node.js 18以上
- Ollama（ローカルで実行）

## セットアップ

1. リポジトリをクローン
```bash
git clone <repository-url>
cd my-ai-chat
```

2. 依存関係をインストール
```bash
npm install
```

3. Ollamaをインストールして起動
```bash
# Ollamaをインストール（macOS）
brew install ollama

# Gemma3モデルをダウンロード
ollama pull gemma3

# Ollamaサーバーを起動
ollama serve
```

4. 開発サーバーを起動
```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いてチャットを開始できます。

## 利用可能なコマンド

- `npm run dev` - 開発サーバーを起動
- `npm run build` - プロダクション用にビルド
- `npm run start` - プロダクションサーバーを起動
- `npm run lint` - ESLintでコードをチェック

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **AI統合**: AI SDK (@ai-sdk/react, @ai-sdk/openai)
- **LLMプロバイダー**: Ollama (Gemma3モデル)

## アーキテクチャ

- フロントエンド: React + AI SDKの`useChat`フックでストリーミングチャット
- バックエンド: Next.js API Route (`/api/chat`) でOllamaとの通信を処理
- AI連携: `localhost:11434`で動作するOllamaのOpenAI互換APIを利用

## 設定

アプリケーションはデフォルトで以下の設定を使用します：

- Ollama URL: `http://localhost:11434/v1`
- モデル: `gemma3`
- API Key: `ollama`（ローカル環境用ダミー値）

設定を変更する場合は `app/api/chat/route.ts` を編集してください。