# EventPulse Engine — 起動手順

## 必要環境

- Docker Desktop（または Docker Engine + Docker Compose）
- Docker Compose v2 以上

## 起動方法

```bash
# program/ ディレクトリに移動
cd program

# Docker イメージのビルド & コンテナ起動
docker compose up --build
```

起動後、以下のURLにアクセスできます：

| URL | 説明 |
| :--- | :--- |
| http://localhost:3000 | トップページ |
| http://localhost:3000/host | 主催者ダッシュボード（ルーム作成） |
| http://localhost:3000/participant?roomId=<ID> | 参加者画面（QRコードから自動アクセス） |
| http://localhost:4000/health | バックエンド ヘルスチェック |
| http://localhost:4000/api/rooms | ルーム一覧 API |

## ローカル開発（Docker なし）

### バックエンド

```bash
cd program/backend
npm install
npm run dev   # ts-node-dev で起動（ポート 4000）
```

### フロントエンド

```bash
cd program/frontend
npm install
npm run dev   # Next.js 開発サーバー（ポート 3000）
```

## 使い方

1. **主催者** が http://localhost:3000/host にアクセスしてルームを作成
2. **主催者ダッシュボード** に表示される QRコードを参加者に提示
3. **参加者** がスマホで QRコードを読み込んで参加
4. モードに応じてリアルタイム集計がダッシュボードに表示される

## 機能モード

| モード | 説明 |
| :--- | :--- |
| `heatmap` | ① スライダー型「感情 & 納得度」リアルタイム・ヒートマップ |
| `quiz` | ② 確信度つきクイズ & ナレッジチェック |
| `multi_slider` | ③ 各択スライダー多軸合意度投票 |
