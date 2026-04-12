import { describe, expect, it } from 'vitest'
import { generateDailyFilePath, generateMarkdownContent } from '../scripts/markdown-generator.js'
import type { MarkdownEntry } from '../scripts/types.js'

describe('generateDailyFilePath', () => {
  it('正しい日別ファイルパスを生成する', () => {
    const date = new Date('2026-01-15T12:00:00Z')
    const path = generateDailyFilePath(date)
    expect(path).toBe('docs/2026/01/15.md')
  })

  it('1桁の月日をゼロパディングする', () => {
    const date = new Date('2026-03-05T12:00:00Z')
    const path = generateDailyFilePath(date)
    expect(path).toBe('docs/2026/03/05.md')
  })

  it('12月31日を正しく処理する', () => {
    // JSTで12月31日になるようにUTCで12月31日の昼を指定
    const date = new Date('2025-12-31T03:00:00Z')
    const path = generateDailyFilePath(date)
    expect(path).toBe('docs/2025/12/31.md')
  })
})

describe('generateMarkdownContent', () => {
  it('記事がない場合は更新なしメッセージを表示', () => {
    const date = new Date('2026-01-15T12:00:00Z')
    const content = generateMarkdownContent(date, [])

    expect(content).toContain('# 2026年01月15日')
    expect(content).toContain("本日はAWS What's Newの更新はありませんでした。")
  })

  it('記事が1件の場合は正しいフォーマットで出力', () => {
    const date = new Date('2026-01-15T12:00:00Z')
    const entries: MarkdownEntry[] = [
      {
        title: 'Amazon EC2 M8g instances now available',
        date: '2026-01-15',
        link: 'https://aws.amazon.com/about-aws/whats-new/2026/01/ec2-m8g-instances/',
        categories: ['EC2', 'Compute'],
        guid: 'ec2-m8g-instances',
        summary: {
          overview: '新しいGraviton4搭載のM8gインスタンスが利用可能になりました。',
          details:
            'M8gインスタンスはGraviton4プロセッサを搭載し、前世代比で最大40%の性能向上を実現します。',
          impact: '高性能なARMベースのインスタンスが必要なワークロードに最適です。',
          technicalNotes: 'Amazon Linux 2023以降で利用可能です。',
          references: [],
        },
      },
    ]

    const content = generateMarkdownContent(date, entries)

    // タイトルチェック
    expect(content).toContain('# 2026年01月15日')

    // 記事タイトルチェック（カテゴリ付き）
    expect(content).toContain('## [EC2, Compute] Amazon EC2 M8g instances now available')

    // メタデータチェック
    expect(content).toContain('**公開日**: 2026-01-15')
    expect(content).toContain('**カテゴリ**: EC2, Compute')
    expect(content).toContain(
      '**リンク**: https://aws.amazon.com/about-aws/whats-new/2026/01/ec2-m8g-instances/',
    )

    // 要約セクションチェック
    expect(content).toContain('### 概要')
    expect(content).toContain('新しいGraviton4搭載のM8gインスタンスが利用可能になりました。')

    expect(content).toContain('### 変更内容・新機能の詳細')
    expect(content).toContain('M8gインスタンスはGraviton4プロセッサを搭載し')

    expect(content).toContain('### 影響範囲・利用シーン')
    expect(content).toContain('高性能なARMベースのインスタンス')

    expect(content).toContain('### 技術的な注意点')
    expect(content).toContain('Amazon Linux 2023以降で利用可能です。')
  })

  it('記事が複数件の場合は区切り線で分離', () => {
    const date = new Date('2026-01-15T12:00:00Z')
    const entries: MarkdownEntry[] = [
      {
        title: 'First Article',
        date: '2026-01-15',
        link: 'https://example.com/1',
        categories: ['EC2'],
        guid: 'article-1',
        summary: {
          overview: 'Overview 1',
          details: 'Details 1',
          impact: 'Impact 1',
          technicalNotes: 'Notes 1',
          references: [],
        },
      },
      {
        title: 'Second Article',
        date: '2026-01-15',
        link: 'https://example.com/2',
        categories: ['S3'],
        guid: 'article-2',
        summary: {
          overview: 'Overview 2',
          details: 'Details 2',
          impact: 'Impact 2',
          technicalNotes: 'Notes 2',
          references: [],
        },
      },
    ]

    const content = generateMarkdownContent(date, entries)

    // 両方の記事が含まれることを確認
    expect(content).toContain('First Article')
    expect(content).toContain('Second Article')

    // 区切り線で分離されていることを確認
    const separatorCount = (content.match(/\n---\n/g) || []).length
    expect(separatorCount).toBe(1) // 2記事間に1つの区切り線
  })

  it('HTMLタグ風のテキストがエスケープされる', () => {
    const date = new Date('2026-01-15T12:00:00Z')
    const entries: MarkdownEntry[] = [
      {
        title: 'Article with angle brackets',
        date: '2026-01-15',
        link: 'https://example.com/article',
        categories: ['RDS'],
        guid: 'article-escape',
        summary: {
          overview: 'CLI例: aws rds copy-db-snapshot --source <arn>',
          details: '/proc/<pid>/fd でファイルディスクリプタを確認できます。',
          impact: '・対象ユーザー: <admin>ロールを持つユーザー',
          technicalNotes: '・コマンド例: aws s3 cp <source> <dest>',
          references: [],
        },
      },
    ]

    const content = generateMarkdownContent(date, entries)

    // <arn>, <pid> 等がエスケープされていることを確認
    expect(content).not.toContain('<arn>')
    expect(content).not.toContain('<pid>')
    expect(content).not.toContain('<admin>')
    expect(content).not.toContain('<source>')
    expect(content).not.toContain('<dest>')
    expect(content).toContain('&lt;arn&gt;')
    expect(content).toContain('&lt;pid&gt;')
  })

  it('参考リンクがある場合は表示する', () => {
    const date = new Date('2026-01-15T12:00:00Z')
    const entries: MarkdownEntry[] = [
      {
        title: 'Article with references',
        date: '2026-01-15',
        link: 'https://example.com/article',
        categories: ['Lambda'],
        guid: 'article-ref',
        summary: {
          overview: 'Overview',
          details: 'Details',
          impact: 'Impact',
          technicalNotes: 'Notes',
          references: [
            'https://docs.aws.amazon.com/lambda/',
            'https://aws.amazon.com/blogs/compute/',
          ],
        },
      },
    ]

    const content = generateMarkdownContent(date, entries)

    expect(content).toContain('### 参考情報')
    expect(content).toContain('https://docs.aws.amazon.com/lambda/')
    expect(content).toContain('https://aws.amazon.com/blogs/compute/')
  })
})
