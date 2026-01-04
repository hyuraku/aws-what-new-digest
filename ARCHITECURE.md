# AWS What's New Digest - Architecture

## Overview

AWS What's New RSSフィードから最新情報を自動収集し、AI要約を付けてGitHub Pagesで公開するシステム。

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                GitHub Actions (Scheduler)                    │
│  - 毎日09:00 JST（00:00 UTC）に実行                          │
│  - 環境変数: OPENAI_API_KEY                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               RSS Feed Collector (collector.ts)              │
│  - AWS What's New RSSパース                                  │
│  - 過去24時間の新規記事を抽出                                │
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
│  - モデル: gpt-5-mini                                        │
│  - 出力: 概要、詳細、影響範囲、技術的注意点、参考リンク      │
│  - セキュリティ: APIキー検証、HTMLサニタイゼーション         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│          Markdown Generator (markdown-generator.ts)          │
│  - ファイル構造: docs/YYYY/MM/DD.md                          │
│  - 日別ファイル生成                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     VitePress Builder                        │
│  - 静的HTML生成                                              │
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
| Language | TypeScript 5.x |
| Runtime | Node.js 24.x |
| Static Site | VitePress 1.x |
| AI | OpenAI gpt-5-mini |
| Test | Vitest 4.x |
| Linter/Formatter | Biome |
| CI/CD | GitHub Actions |

## Directory Structure

```
aws-whats-new-digest/
├── .github/
│   ├── workflows/
│   │   ├── collect.yml       # 毎日実行される収集ワークフロー
│   │   ├── deploy.yml        # VitePressデプロイ
│   │   └── security.yml      # セキュリティスキャン
│   └── dependabot.yml        # 依存関係自動更新
├── docs/
│   ├── .vitepress/
│   │   └── config.ts         # VitePress設定
│   ├── index.md              # トップページ
│   └── YYYY/MM/DD.md         # 日別アーカイブ
├── scripts/
│   ├── types.ts              # 型定義
│   ├── collector.ts          # RSS収集ロジック
│   ├── summarizer.ts         # AI要約ロジック
│   ├── markdown-generator.ts # Markdownファイル生成
│   ├── duplicate-checker.ts  # 重複チェック
│   └── collect.ts            # エントリポイント
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
- カテゴリからAWSサービス名を抽出
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

- OpenAI gpt-5-miniでJSON形式の要約を生成
- APIキーフォーマット検証
- HTMLサニタイゼーション（XSS対策）
- レート制限対策（バッチ処理 + 待機）

### 4. Markdown Generator (`scripts/markdown-generator.ts`)

- `docs/YYYY/MM/DD.md` 形式で日別ファイルを生成
- 記事がない日は「本日は更新なし」を記載
- 既存ファイルへの追記をサポート

## GitHub Actions Workflows

### `collect.yml` - 毎日の自動収集

- 毎日00:00 UTC（09:00 JST）に実行
- 権限を最小化（contents: write のみ）
- セキュリティ監査を実行

### `deploy.yml` - VitePressデプロイ

- `repository_dispatch` イベントで起動
- VitePressをビルドしてGitHub Pagesにデプロイ

### `security.yml` - セキュリティスキャン

- 週次で依存関係の脆弱性をチェック
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
GitHub Actions Scheduler
  └─> collect.ts
      └─> collector.ts (RSS取得)
          └─> duplicate-checker.ts (重複除外)
              └─> summarizer.ts (AI要約)
                  └─> markdown-generator.ts (Markdown生成)
                      └─> Git Commit & Push
                          └─> deploy.yml (VitePress Build)
                              └─> GitHub Pages
```
