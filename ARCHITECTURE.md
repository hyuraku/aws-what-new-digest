# AWS What's New Digest - Architecture

## Overview

AWS What's New RSSフィードから最新情報を自動収集し、AI要約を付けてGitHub Pagesで公開するシステム。

> **名称について**: リポジトリ名・公開URLは `aws-what-new-digest` です（歴史的経緯によるもので変更しません）。
> `package.json` の name は `aws-whats-new-digest` ですが、正とするのはリポジトリ名・`BASE_PATH` 側です。

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                GitHub Actions (Scheduler)                    │
│  - 毎日10:00 JST（01:00 UTC）に実行 (collect.yml)            │
│  - 環境変数: OPENAI_API_KEY                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               RSS Feed Collector (collector.ts)              │
│  - AWS What's New RSSパース                                  │
│  - 過去24時間の新規記事を抽出                                │
│  - SERVICE_NAME_MAP によるサービス名の一次正規化             │
│  - SSRF対策: ドメインホワイトリスト検証                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            Duplicate Checker (duplicate-checker.ts)          │
│  - 既存Markdownファイルとの照合                              │
│  - 過去N日間の重複を検出                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                AI Summarizer (summarizer.ts)                 │
│  - モデル: 環境変数 AI_MODEL で指定（デフォルト gpt-5-mini） │
│  - 出力: 概要、詳細、影響範囲、技術的注意点、参考リンク      │
│  - セキュリティ: APIキー検証、HTMLサニタイゼーション         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│          Markdown Generator (markdown-generator.ts)          │
│  - ファイル構造: docs/YYYY/MM/DD.md（JST基準）               │
│  - 日別ファイル生成・既存ファイルへの追記                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         VitePress Builder (deploy.yml / docs:build)          │
│  - generate-pwa-icons.ts: PWAアイコン生成                    │
│  - generate-service-pages.ts: サービス別タグページ生成       │
│    （category-normalizer.ts による表示名の二次正規化）       │
│  - 静的HTML生成 / PWA（@vite-pwa/vitepress）                 │
│  - サイドバー自動生成                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pages Deploy                       │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript |
| Runtime | Node.js 24.x |
| Static Site | VitePress 1.x + @vite-pwa/vitepress |
| AI | OpenAI API（モデルは環境変数 `AI_MODEL` で指定、デフォルト gpt-5-mini） |
| Test | Vitest 4.x |
| Linter/Formatter | Biome |
| CI/CD | GitHub Actions |

## Directory Structure

```
aws-what-new-digest/
├── .github/
│   ├── workflows/
│   │   ├── collect.yml       # 毎日実行される収集ワークフロー（PR作成→自動マージ）
│   │   ├── ci.yml            # 品質ゲート（typecheck/lint/test/build）+ Dependabot自動マージ
│   │   ├── deploy.yml        # VitePressビルド + GitHub Pagesデプロイ
│   │   └── security.yml      # セキュリティスキャン（週次 + PR時）
│   └── dependabot.yml        # 依存関係自動更新
├── docs/
│   ├── .vitepress/
│   │   ├── config.ts         # VitePress設定（サイドバー生成・PWA/workbox設定）
│   │   └── theme/            # カスタムテーマ（SW登録・スタイル）
│   ├── index.md              # トップページ
│   ├── services/             # サービス別タグページ（自動生成）
│   └── YYYY/MM/DD.md         # 日別アーカイブ
├── scripts/
│   ├── types.ts                  # 型定義
│   ├── collector.ts              # RSS収集ロジック（SERVICE_NAME_MAP を含む）
│   ├── summarizer.ts             # AI要約ロジック
│   ├── markdown-generator.ts     # Markdownファイル生成・再パース
│   ├── duplicate-checker.ts      # 重複チェック
│   ├── category-normalizer.ts    # 表示用カテゴリの二次正規化
│   ├── generate-service-pages.ts # サービス別ページ生成
│   ├── generate-og-images.ts     # OG画像生成（docs/public/og/）
│   ├── generate-pwa-icons.ts     # PWAアイコン生成
│   ├── timezone.ts               # JST変換ユーティリティ
│   └── collect.ts                # エントリポイント
├── tests/
│   ├── collector.test.ts
│   ├── duplicate-checker.test.ts
│   └── markdown-generator.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Components

### 1. RSS Feed Collector (`scripts/collector.ts`)

```typescript
interface AWSWhatsNewItem {
  title: string
  link: string
  pubDate: Date
  content: string
  categories: string[]
  guid: string
}
```

- RSSフィードをパースして記事を取得
- 過去24時間の記事をフィルター
- カテゴリからAWSサービス名を抽出（`SERVICE_NAME_MAP` による一次正規化）
- SSRF対策: 許可ドメインのホワイトリスト検証

### 2. Duplicate Checker (`scripts/duplicate-checker.ts`)

- 既存のMarkdownファイルからリンクを抽出
- 過去N日間（デフォルト7日）の重複をチェック
- 新規記事のみを返却

### 3. AI Summarizer (`scripts/summarizer.ts`)

```typescript
interface SummaryResult {
  overview: string
  details: string
  impact: string
  technicalNotes: string
  references: string[]
}
```

- OpenAI APIでJSON形式の要約を生成（モデルは `AI_MODEL` で変更可能）
- APIキーフォーマット検証
- HTMLサニタイゼーション（XSS対策）
- レート制限対策（バッチ処理 + 待機）

### 4. Markdown Generator (`scripts/markdown-generator.ts`)

- `docs/YYYY/MM/DD.md` 形式で日別ファイルを生成（JST基準）
- 記事がない日は「本日は更新なし」を記載
- 既存ファイルへの追記をサポート（`extractEntriesFromMarkdown` で再パースして結合）

### 5. Service Pages Generator (`scripts/generate-service-pages.ts`)

- `docs:build` の一部としてビルド時に実行（`deploy.yml`）
- 全日次Markdownを走査してサービス別タグページ（`docs/services/`）を生成
- `category-normalizer.ts` が過去データの表記揺れを表示時に吸収

## GitHub Actions Workflows

### `collect.yml` - 毎日の自動収集

- 毎日01:00 UTC（10:00 JST）に実行（`workflow_dispatch` による手動実行も可能）
- 権限: `contents: write` + `pull-requests: write`（その他は明示的に無効化）
- フロー: 収集 → `auto-update/*` ブランチ作成 → PR作成 → squash マージ → `repository_dispatch` でデプロイをトリガー

### `ci.yml` - 品質ゲート

- PR・main への push で typecheck / lint / test / docs:build を実行
- Dependabot PR の自動マージ（ブランチ保護は使わず `needs` で順序を保証）

### `deploy.yml` - VitePressデプロイ

- `repository_dispatch`（deploy-site）および main への `docs/**` push で起動
- VitePressをビルドしてGitHub Pagesにデプロイ

### `security.yml` - セキュリティスキャン

- 週次 + PR時に依存関係の脆弱性をチェック
- シークレットのコミットを検出

## Security

| 対策 | 実装 |
|------|------|
| APIキー管理 | GitHub Secrets + フォーマット検証 |
| XSS対策 | HTMLサニタイゼーション強化 |
| SSRF対策 | ドメインホワイトリスト |
| 依存関係 | Dependabot + 週次監査 |
| GitHub Actions | 最小権限 + persist-credentials: false |

## Data Flow

```
GitHub Actions Scheduler (collect.yml, 01:00 UTC / 10:00 JST)
  └─> collect.ts
      └─> collector.ts (RSS取得)
          └─> duplicate-checker.ts (重複除外)
              └─> summarizer.ts (AI要約)
                  └─> markdown-generator.ts (Markdown生成)
                      └─> auto-update/* ブランチ + PR作成 + squashマージ
                          └─> repository_dispatch (deploy-site)
                              └─> deploy.yml (docs:build)
                                  ├─> generate-pwa-icons.ts (PWAアイコン)
                                  ├─> generate-service-pages.ts (サービス別ページ)
                                  └─> VitePress Build → GitHub Pages
```
