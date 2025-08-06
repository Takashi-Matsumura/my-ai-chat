# プロキシ環境でのセットアップガイド

社内プロキシ環境でDockerコンテナを使用する場合の設定手順です。

## 初期設定

### 1. 環境変数ファイルの作成

`.env.local.example`をコピーして`.env.local`を作成し、社内環境に合わせて編集します：

```bash
cp .env.local.example .env.local
```

以下の項目を設定：
- `HTTP_PROXY`: 社内プロキシサーバーのURL
- `HTTPS_PROXY`: 社内プロキシサーバーのURL（通常HTTP_PROXYと同じ）
- `NO_PROXY`: プロキシを使用しないホスト（ローカルIPアドレスを追加）

### 2. Dockerコンテナの起動

```bash
docker-compose up -d --build
```

### 3. Ollamaサーバーの設定

ブラウザで `http://[あなたのIPアドレス]:8888/settings` にアクセスし、
Ollamaサーバー設定で以下のいずれかを入力：

- `http://[ホストマシンのIPアドレス]:11434`
- `http://host.docker.internal:11434`

## トラブルシューティング

### 接続エラーが発生する場合

1. ホストマシンでOllamaが起動していることを確認
   ```bash
   ollama list
   ```

2. プロキシ設定が正しいことを確認
   ```bash
   docker exec my-ai-chat-nextjs-1 env | grep PROXY
   ```

3. Dockerコンテナからホストへの接続を確認
   ```bash
   docker exec my-ai-chat-nextjs-1 wget -O- http://host.docker.internal:11434/api/tags
   ```

### ポート関連の問題

デフォルトポート（8888）が使用できない場合は、`docker-compose.yml`の
ポート設定を変更してください。