import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  extractEntriesFromMarkdown,
  generateMarkdownContent,
} from '../scripts/markdown-generator.js'
import type { MarkdownEntry } from '../scripts/types.js'

function makeEntry(overrides: Partial<MarkdownEntry> = {}): MarkdownEntry {
  return {
    title: 'Amazon EC2 M8g instances now available',
    date: '2026-01-15',
    link: 'https://aws.amazon.com/about-aws/whats-new/2026/01/ec2-m8g-instances/',
    categories: ['EC2', 'Compute'],
    guid: 'https://aws.amazon.com/about-aws/whats-new/2026/01/ec2-m8g-instances/',
    summary: {
      overview: '新しいGraviton4搭載のM8gインスタンスが利用可能になりました。',
      details: 'M8gインスタンスは前世代比で最大40%の性能向上を実現します。',
      impact: '高性能なARMベースのインスタンスが必要なワークロードに最適です。',
      technicalNotes: 'Amazon Linux 2023以降で利用可能です。',
      references: [],
    },
    ...overrides,
  }
}

describe('extractEntriesFromMarkdown', () => {
  it('「更新なし」ページからは空配列を返す', () => {
    const content = "# 2026年01月15日\n\n本日はAWS What's Newの更新はありませんでした。\n"
    expect(extractEntriesFromMarkdown(content)).toEqual([])
  })

  it('1記事のMarkdownから全フィールドを抽出する', () => {
    const date = new Date('2026-01-15T12:00:00Z')
    const content = generateMarkdownContent(date, [makeEntry()])

    const entries = extractEntriesFromMarkdown(content)

    expect(entries).toHaveLength(1)
    const entry = entries[0]
    expect(entry.title).toBe('Amazon EC2 M8g instances now available')
    expect(entry.date).toBe('2026-01-15')
    expect(entry.link).toBe('https://aws.amazon.com/about-aws/whats-new/2026/01/ec2-m8g-instances/')
    expect(entry.categories).toEqual(['EC2', 'Compute'])
    // GUIDはMarkdownに保存されないため、リンクで代用される（既知の仕様）
    expect(entry.guid).toBe(entry.link)
    expect(entry.summary.overview).toBe(
      '新しいGraviton4搭載のM8gインスタンスが利用可能になりました。',
    )
    expect(entry.summary.details).toBe('M8gインスタンスは前世代比で最大40%の性能向上を実現します。')
  })

  it('複数記事を---区切りからすべて抽出する', () => {
    const date = new Date('2026-01-15T12:00:00Z')
    const entries = [
      makeEntry(),
      makeEntry({
        title: 'Amazon S3 new storage class',
        link: 'https://aws.amazon.com/about-aws/whats-new/2026/01/s3-storage-class/',
        categories: ['S3'],
      }),
      makeEntry({
        title: 'AWS Lambda runtime update',
        link: 'https://aws.amazon.com/about-aws/whats-new/2026/01/lambda-runtime/',
        categories: ['Lambda'],
      }),
    ]
    const content = generateMarkdownContent(date, entries)

    const extracted = extractEntriesFromMarkdown(content)

    expect(extracted).toHaveLength(3)
    expect(extracted.map((e) => e.title)).toEqual([
      'Amazon EC2 M8g instances now available',
      'Amazon S3 new storage class',
      'AWS Lambda runtime update',
    ])
  })

  it('参考情報のリンクリストを抽出する', () => {
    const date = new Date('2026-01-15T12:00:00Z')
    const entry = makeEntry({
      summary: {
        ...makeEntry().summary,
        references: [
          'https://docs.aws.amazon.com/ec2/latest/userguide/',
          'https://aws.amazon.com/ec2/instance-types/',
        ],
      },
    })
    const content = generateMarkdownContent(date, [entry])

    const extracted = extractEntriesFromMarkdown(content)

    expect(extracted[0].summary.references).toEqual([
      'https://docs.aws.amazon.com/ec2/latest/userguide/',
      'https://aws.amazon.com/ec2/instance-types/',
    ])
  })
})

describe('generateMarkdownContent と extractEntriesFromMarkdown のラウンドトリップ', () => {
  it('プレーンテキストの要約は完全に往復する', () => {
    const date = new Date('2026-01-15T12:00:00Z')
    const original = [
      makeEntry(),
      makeEntry({
        title: 'Second article',
        link: 'https://aws.amazon.com/about-aws/whats-new/2026/01/second/',
        categories: ['RDS'],
      }),
    ]

    const content = generateMarkdownContent(date, original)
    const extracted = extractEntriesFromMarkdown(content)

    expect(extracted).toHaveLength(2)
    for (let i = 0; i < original.length; i++) {
      expect(extracted[i].title).toBe(original[i].title)
      expect(extracted[i].date).toBe(original[i].date)
      expect(extracted[i].link).toBe(original[i].link)
      expect(extracted[i].categories).toEqual(original[i].categories)
      expect(extracted[i].summary.overview).toBe(original[i].summary.overview)
      expect(extracted[i].summary.details).toBe(original[i].summary.details)
      expect(extracted[i].summary.impact).toBe(original[i].summary.impact)
      expect(extracted[i].summary.technicalNotes).toBe(original[i].summary.technicalNotes)
      expect(extracted[i].summary.references).toEqual(original[i].summary.references)
    }
  })

  it('再生成しても内容が安定する（2回目の往復で変化しない）', () => {
    // 「・項目名:」形式や <> を含む現実的なデータは1回目の生成で
    // Markdownリスト形式・エスケープ済み表現に変換される。
    // 追記処理（collect.ts）は 抽出→再生成 を繰り返すため、
    // 2回目以降の往復で内容が変化しない（冪等である）ことが重要。
    const date = new Date('2026-01-15T12:00:00Z')
    const entry = makeEntry({
      summary: {
        overview: 'HTMLの<div>タグに関する更新です。',
        details: '詳細は max_tokens < 4000 の場合に適用されます。',
        impact: '・対象ユーザー: 開発者\n・利用シーン: 本番環境',
        technicalNotes: '',
        references: [],
      },
    })

    const firstContent = generateMarkdownContent(date, [entry])
    const firstExtracted = extractEntriesFromMarkdown(firstContent)
    const secondContent = generateMarkdownContent(date, firstExtracted)
    const secondExtracted = extractEntriesFromMarkdown(secondContent)

    expect(secondExtracted).toEqual(firstExtracted)
  })

  it('空のtechnicalNotesは「特になし」として抽出される（既知の仕様）', () => {
    const date = new Date('2026-01-15T12:00:00Z')
    const entry = makeEntry({
      summary: { ...makeEntry().summary, technicalNotes: '' },
    })

    const content = generateMarkdownContent(date, [entry])
    const extracted = extractEntriesFromMarkdown(content)

    expect(extracted[0].summary.technicalNotes).toBe('特になし')
  })
})

describe('実データsmoke: docs/ 配下の全日次Markdownがパース可能', () => {
  const docsRoot = fileURLToPath(new URL('../docs', import.meta.url))

  function findDailyMarkdowns(): string[] {
    const files: string[] = []
    for (const year of readdirSync(docsRoot)) {
      if (!/^\d{4}$/.test(year)) continue
      const yearDir = join(docsRoot, year)
      for (const month of readdirSync(yearDir)) {
        if (!/^\d{2}$/.test(month)) continue
        const monthDir = join(yearDir, month)
        for (const day of readdirSync(monthDir)) {
          if (!/^\d{2}\.md$/.test(day)) continue
          files.push(join(monthDir, day))
        }
      }
    }
    return files
  }

  it('全日次ファイルが例外なくパースでき、記事ページは1件以上のエントリを持つ', () => {
    const files = findDailyMarkdowns()
    // アーカイブは171ファイル以上存在するはず（大幅な減少はディレクトリ構造変化のシグナル）
    expect(files.length).toBeGreaterThanOrEqual(150)

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const entries = extractEntriesFromMarkdown(content)

      if (content.includes("本日はAWS What's Newの更新はありませんでした")) {
        expect(entries, file).toEqual([])
      } else {
        // 記事ページなのに0件 = パース失敗（フォーマット変更のカナリア）
        expect(entries.length, `パース失敗: ${file}`).toBeGreaterThan(0)
        for (const entry of entries) {
          expect(entry.title, file).toBeTruthy()
          expect(entry.link, file).toMatch(/^https?:\/\//)
          expect(entry.date, file).toMatch(/^\d{4}-\d{2}-\d{2}$/)
          expect(entry.categories.length, file).toBeGreaterThan(0)
        }
      }
    }
  })

  it('抽出したエントリ数がH2見出し数と一致する（取りこぼし検出）', () => {
    for (const file of findDailyMarkdowns()) {
      const content = readFileSync(file, 'utf-8')
      const headingCount = (content.match(/^## \[/gm) ?? []).length
      const entries = extractEntriesFromMarkdown(content)
      expect(entries.length, `取りこぼし: ${file}`).toBe(headingCount)
    }
  })
})
