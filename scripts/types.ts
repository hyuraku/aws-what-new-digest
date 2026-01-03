/**
 * AWS What's New RSSフィードのアイテム
 */
export interface AWSWhatsNewItem {
  /** 記事のタイトル */
  title: string
  /** 記事のURL */
  link: string
  /** 公開日時 */
  pubDate: Date
  /** HTML形式のコンテンツ */
  content: string
  /** サービス名のカテゴリ（例: EC2, S3, Lambda） */
  categories: string[]
  /** 一意識別子 */
  guid: string
}

/**
 * AI要約の結果
 */
export interface SummaryResult {
  /** 概要（1-2文） */
  overview: string
  /** 変更内容・新機能の詳細 */
  details: string
  /** 影響範囲・利用シーン */
  impact: string
  /** 技術的な注意点 */
  technicalNotes: string
  /** 参考リンク */
  references: string[]
}

/**
 * Markdownエントリ
 */
export interface MarkdownEntry {
  /** タイトル */
  title: string
  /** 公開日（YYYY-MM-DD形式） */
  date: string
  /** 記事のURL */
  link: string
  /** カテゴリリスト */
  categories: string[]
  /** AI要約結果 */
  summary: SummaryResult
  /** GUID */
  guid: string
}
