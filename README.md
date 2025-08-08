# My AI Chat

Next.jsとAI SDKを使用してOllamaと連携する高機能チャットアプリケーションです。  
LLMモデル管理、ダーク/ライトテーマ、チャット履歴管理など、豊富な機能を提供します。

## 機能

- 🤖 **LLMモデル管理**: ダウンロード、インストール、アンインストール、モデル詳細情報表示
- 🧠 **Thinking機能**: gpt-ossモデルで思考プロセスを可視化
- 🌓 **ダーク/ライトテーマ**: お好みのテーマでご利用いただけます
- 💾 **チャット履歴管理**: 複数のチャットスレッドを管理
- 📊 **メタデータ表示**: トークン数、レスポンス時間など
- 📱 **レスポンシブデザイン**: モバイル・デスクトップ対応
- 🔄 **リアルタイムストリーミング**: AIからの即座な応答
- ⚙️ **Ollama サーバー切り替え**: アプリ内で複数のOllamaサーバーを動的に切り替え
- 🌐 **プロキシ対応**: 企業環境・社内プロキシでの利用をサポート
- 🔧 **環境変数設定**: .env.local での柔軟な設定管理
- 📄 **データのインポート/エクスポート**: チャット履歴のバックアップと復元
- 📂 **ファイル添付対応**: 画像・テキストファイルのアップロードと分析
- 🎨 **ローディングアニメーション**: 美しい応答待機中の視覚的フィードバック
- ⚙️ **簡単設定アクセス**: ヘッダーの設定ボタンでワンクリックアクセス

## 必要な環境

- Docker & Docker Compose

## 🚀 簡単デプロイ

### 自動デプロイスクリプト使用（推奨）

1. リポジトリをクローン
```bash
git clone https://github.com/Takashi-Matsumura/my-ai-chat.git
cd my-ai-chat
```

2. デプロイスクリプトを実行
```bash
./deploy.sh
```

このスクリプトが自動的に以下を実行します：
- 既存コンテナの停止・削除
- 新しいイメージのビルド
- コンテナの起動
- 動作確認

### 手動デプロイ

1. リポジトリをクローン
```bash
git clone https://github.com/Takashi-Matsumura/my-ai-chat.git
cd my-ai-chat
```

2. Dockerコンテナを起動
```bash
docker-compose up -d
```

3. アプリケーションにアクセス  
   ブラウザで `http://localhost:8888` を開いてチャットを開始できます。

## 🎯 アクセス先

- **チャットアプリ**: http://localhost:8888
- **モデル管理**: http://localhost:8888/settings

## 🔧 初回セットアップ

新規ユーザーは初回アクセス時に以下の設定が必要です：

### 1. Ollamaサーバー設定
1. チャット画面右上の⚙️設定ボタンをクリック
2. 設定画面で「サーバー設定」をクリック
3. Ollama サーバー URL を設定:
   - **ローカル環境**: `http://localhost:11434`
   - **リモートサーバー**: `http://[IPアドレス]:11434`
4. 「接続テスト」で動作確認後、「保存」

### 2. プロキシ設定 (社内環境の場合)
1. チャット画面右上の⚙️設定ボタンをクリック
2. 設定画面で「プロキシ設定」をクリック
3. プロキシサーバー情報を入力:
   ```
   HTTPプロキシ: http://proxy.company.com:8080
   HTTPSプロキシ: http://proxy.company.com:8080
   プロキシ除外: localhost,127.0.0.1,::1,[ローカルIPアドレス]
   ```
3. 「プロキシを有効にする」にチェックを入れ、「保存」

**注意**: これらの設定はブラウザのlocalStorageに保存され、各ユーザーが個別に設定する必要があります。

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
- **フロントエンド**: React with AI SDK hooks (`@ai-sdk/react`) でストリーミングチャットインターフェース
- **バックエンド**: Next.js API route (`/api/chat`) でOllamaからのストリーミング応答処理
- **スタイリング**: Tailwind CSS with custom animations
- **AI統合**: `@ai-sdk/openai` でOllama (`http://localhost:11434/v1`) に接続
- **Thinking支援**: gpt-ossモデルの思考プロセス可視化対応
- **データ保存**: localStorage での完全クライアントサイド保存
- **Proxy支援**: 企業環境対応のサーバーサイドプロキシ処理
- **環境検知**: Docker/開発環境の自動切り替え

### 重要なファイル
- `app/page.tsx` - 統一された `sendMessage` 関数でのメインチャットインターフェース
- `app/api/chat/route.ts` - モデル対応型カスタムストリーミング処理
- `app/utils/modelUtils.ts` - Thinking/標準モデルの判定ロジック
- `app/utils/environment.ts` - 環境に応じたOllama URL自動切り替え
- `app/contexts/ThreadContext.tsx` - チャットスレッドとlocalStorage管理
- `app/contexts/OllamaContext.tsx` - Ollamaサーバー管理と動的切り替え
- `app/contexts/ProxyContext.tsx` - プロキシ設定管理
- `app/components/ModelManager.tsx` - LLMモデルのインストール・削除管理
- `app/globals.css` - カスタムCSS animations (thinking-dots, pulse-glow等)

### チャットフロー
1. フロントエンドの統一された `sendMessage` 関数でユーザー入力を処理
2. モデル種別に応じて適切なストリーミングフックを使用
3. `/api/chat` エンドポイントでモデル対応型の処理を実行
4. gpt-ossモデル: thinking -> content の2段階ストリーミング
5. 標準モデル: 直接contentストリーミング
6. フロントエンドで美しいローディングアニメーションと適切な応答表示

## ⚙️ 設定

### ポート設定
- **Next.jsアプリ**: 8888 (Dockerコンテナ)
- **Ollama サーバー**: 11434 (ホストマシン)
- **内部通信URL**: `http://host.docker.internal:11434` (コンテナからホストへの通信)

### Ollamaサーバー設定

#### 動的サーバー切り替え機能
アプリケーション内で複数のOllamaサーバーを動的に切り替えることができます。

- **設定場所**: チャット画面右上の⚙️設定ボタン → 「サーバー設定」
- **環境自動検知**: Docker環境では `http://host.docker.internal:11434`、開発環境では `http://localhost:11434` を自動選択
- **設定保存**: ブラウザのlocalStorageに永続化
- **接続テスト**: 設定前にサーバーの動作確認が可能
- **リアルタイム切り替え**: アプリ再起動不要でサーバー変更が可能

#### 使用例
- **ローカルOllama**: `http://localhost:11434`
- **カスタムポート**: `http://localhost:11435`
- **リモートサーバー**: `http://192.168.1.100:11434`

### 環境変数設定

アプリケーションは環境変数による設定をサポートしています。

#### 設定ファイル
`.env.local`ファイルを作成して設定を行います（`.env.example`を参照）：

```bash
# Ollama設定
OLLAMA_URL=http://host.docker.internal:11434

# プロキシ設定（社内プロキシ環境の場合）
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,::1,host.docker.internal
```

#### プロキシ環境での利用
企業内のプロキシ環境でも利用可能です：

1. **プロキシ設定UI**: アプリケーション内で設定可能
2. **環境変数**: `.env.local`での設定
3. **Docker環境**: docker-compose.ymlでプロキシ環境変数を自動継承

**注意**: `OLLAMA_URL`環境変数を設定すると、アプリ内の動的サーバー切り替え機能より優先されます。

### モデル管理
チャット画面右上の⚙️設定ボタンからモデル管理画面（/settings）にアクセスし、以下が可能です：
- 🔽 **ダウンロード**: 15以上のモデルから選択
- 📦 **インストール**: バックグラウンド処理で通知付き
- 🗑️ **アンインストール**: 不要なモデルの削除
- 📊 **モデル情報**: 詳細メタデータとパフォーマンス情報の表示
- ⚡ **チャット内選択**: ヘッダーのドロップダウンで即座にモデル変更可能

### 推奨モデル
- **軽量**: `gemma2:2b` (1.5GB)
- **日本語対応**: `dsasai/llama3-elyza-jp-8b` (4.6GB)
- **高性能**: `mistral:latest` (4.1GB)

## 💾 データの永続性とバックアップ

### チャットデータの保存場所
チャットデータは **ブラウザのlocalStorage** に保存されます。データベースは使用していません。

### データが失われるタイミング

#### 🚨 **完全にデータが失われる場合**
- **ブラウザのデータクリア**: キャッシュ・Cookie削除時
- **ブラウザ設定**: 「サイトデータを削除」実行時
- **プライベートモード**: シークレットモード使用時（終了時に削除）
- **ブラウザ・OS操作**: アンインストール、OS初期化
- **システム障害**: ハードディスククラッシュ、ファイル破損

#### ⚠️ **データが見えなくなる場合**
- **異なるブラウザ使用**: Chrome ↔ Safari等の切り替え
- **異なるデバイス使用**: PC ↔ スマートフォン等
- **プライベートモード使用**: 通常モードのデータが見えない

### データの永続性

#### ✅ **保持されます**
- 通常のブラウザ使用
- ページリロード・ブラウザ再起動
- PC再起動・アプリ更新
- サーバー再起動・ネットワーク切断

### 🔄 バックアップ機能
重要なチャットを失わないため、以下の機能を提供しています：

- **📤 エクスポート**: チャットデータをJSONファイルでダウンロード
- **📥 インポート**: バックアップファイルから復元
- **🔗 アクセス**: 設定画面（/settings）から利用可能

**推奨**: 重要なチャットは定期的にエクスポートしてバックアップを取ることをお勧めします。