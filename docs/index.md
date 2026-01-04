---
layout: home

hero:
  name: "AWS What's New"
  text: "Digest"
  tagline: AWSの最新アップデートを、AIによる日本語要約付きで毎日お届け
  actions:
    - theme: brand
      text: 最新の更新を見る
      link: /

features:
  - icon: ⚡
    title: リアルタイム収集
    details: GitHub Actionsで毎日自動実行。AWS What's New RSSフィードから最新情報をキャッチアップ
  - icon: 🧠
    title: AI要約
    details: OpenAI GPTによる構造化された日本語要約。概要・詳細・影響範囲・技術的注意点を網羅
  - icon: 🔍
    title: 高速検索
    details: VitePressのローカル検索で過去のアップデートを瞬時に発見。キーワード、サービス名で絞り込み
---

<div class="home-content">

## システム概要

AWS What's New Digestは、AWSの公式What's Newフィードを自動収集し、**AIによる構造化された日本語要約**を生成するシステムです。

### 要約の構成

各エントリについて、以下の4つの観点から解説します：

| セクション | 内容 |
|-----------|------|
| **概要** | 1-2文で変更内容を簡潔に説明 |
| **変更内容・新機能の詳細** | 技術的な詳細説明 |
| **影響範囲・利用シーン** | どのようなユーザーに影響があるか |
| **技術的な注意点** | 移行時の考慮事項や制限事項 |

---

## 免責事項

::: warning 注意
本サイトの情報はAIによる要約であり、正確性を保証するものではありません。最新かつ正確な情報は、必ず[AWS公式サイト](https://aws.amazon.com/new/)でご確認ください。
:::

本サイトはAWSの公式サービスではありません。

</div>

<style>
.home-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

.home-content h2 {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  margin-top: 48px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--aws-amber-500, #f59e0b);
}

.home-content h3 {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  color: var(--aws-amber-500, #f59e0b);
  margin-top: 32px;
}

.home-content table {
  width: 100%;
  margin: 24px 0;
  border-collapse: collapse;
}

.home-content th,
.home-content td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
}

.home-content th {
  font-family: var(--font-mono);
  font-weight: 600;
  background: var(--vp-c-bg-alt);
}

.home-content pre {
  background: var(--vp-c-bg-alt);
  padding: 16px 20px;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  overflow-x: auto;
}

.home-content .warning {
  background: rgba(245, 158, 11, 0.1);
  border-left: 4px solid var(--aws-amber-500, #f59e0b);
  padding: 16px 20px;
  border-radius: 0 8px 8px 0;
  margin: 24px 0;
}

.dark .home-content .warning {
  background: rgba(245, 158, 11, 0.15);
}
</style>
