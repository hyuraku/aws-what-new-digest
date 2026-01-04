import { describe, expect, it } from 'vitest'
import {
  extractLinksFromMarkdown,
  filterNewItems,
  getRecentDates,
} from '../scripts/duplicate-checker.js'
import type { AWSWhatsNewItem } from '../scripts/types.js'

describe('getRecentDates', () => {
  it('直近7日分の日付を生成', () => {
    const baseDate = new Date('2026-01-15T12:00:00Z')
    const dates = getRecentDates(baseDate, 7)

    expect(dates).toHaveLength(7)
    expect(dates[0].toISOString().split('T')[0]).toBe('2026-01-15') // 当日
    expect(dates[1].toISOString().split('T')[0]).toBe('2026-01-14') // 1日前
    expect(dates[6].toISOString().split('T')[0]).toBe('2026-01-09') // 6日前
  })

  it('1日分のみの場合', () => {
    const baseDate = new Date('2026-01-15T12:00:00Z')
    const dates = getRecentDates(baseDate, 1)

    expect(dates).toHaveLength(1)
    expect(dates[0].toISOString().split('T')[0]).toBe('2026-01-15')
  })

  it('月をまたぐ場合も正しく処理', () => {
    const baseDate = new Date('2026-02-03T12:00:00Z')
    const dates = getRecentDates(baseDate, 5)

    expect(dates).toHaveLength(5)
    expect(dates[0].toISOString().split('T')[0]).toBe('2026-02-03')
    expect(dates[3].toISOString().split('T')[0]).toBe('2026-01-31') // 月をまたぐ
    expect(dates[4].toISOString().split('T')[0]).toBe('2026-01-30')
  })
})

describe('extractLinksFromMarkdown', () => {
  it('1つのリンクを正しく抽出', () => {
    const markdown = `
# 2026年01月15日

## [EC2] Amazon EC2 M8g instances now available
- **公開日**: 2026-01-15
- **カテゴリ**: EC2, Compute
- **リンク**: https://aws.amazon.com/about-aws/whats-new/2026/01/ec2-m8g/

### 概要
新しいインスタンスです。
`
    const links = extractLinksFromMarkdown(markdown)
    expect(links).toEqual(['https://aws.amazon.com/about-aws/whats-new/2026/01/ec2-m8g/'])
  })

  it('複数のリンクを抽出', () => {
    const markdown = `
# 2026年01月15日

## Article 1
- **リンク**: https://aws.amazon.com/article1

---

## Article 2
- **リンク**: https://aws.amazon.com/article2

---

## Article 3
- **リンク**: https://aws.amazon.com/article3
`
    const links = extractLinksFromMarkdown(markdown)
    expect(links).toHaveLength(3)
    expect(links).toContain('https://aws.amazon.com/article1')
    expect(links).toContain('https://aws.amazon.com/article2')
    expect(links).toContain('https://aws.amazon.com/article3')
  })

  it('重複するリンクを除外', () => {
    const markdown = `
- **リンク**: https://aws.amazon.com/same
- **リンク**: https://aws.amazon.com/same
- **リンク**: https://aws.amazon.com/different
`
    const links = extractLinksFromMarkdown(markdown)
    expect(links).toHaveLength(2)
    expect(links).toContain('https://aws.amazon.com/same')
    expect(links).toContain('https://aws.amazon.com/different')
  })

  it('リンクがない場合は空配列', () => {
    const markdown = `
# 2026年01月16日

本日はAWS What's Newの更新はありませんでした。
`
    const links = extractLinksFromMarkdown(markdown)
    expect(links).toEqual([])
  })

  it('不正な形式のリンクは無視', () => {
    const markdown = `
リンク: https://invalid-format.com
- リンク https://also-invalid.com
- **リンク**: https://valid.com
`
    const links = extractLinksFromMarkdown(markdown)
    expect(links).toEqual(['https://valid.com'])
  })
})

describe('filterNewItems', () => {
  it('すべて新規の場合は全件返す', () => {
    const items: AWSWhatsNewItem[] = [
      {
        title: 'Article 1',
        link: 'https://aws.amazon.com/article1',
        pubDate: new Date(),
        content: 'Content 1',
        categories: ['EC2'],
        guid: 'guid1',
      },
      {
        title: 'Article 2',
        link: 'https://aws.amazon.com/article2',
        pubDate: new Date(),
        content: 'Content 2',
        categories: ['S3'],
        guid: 'guid2',
      },
    ]
    const existingLinks: string[] = []

    const newItems = filterNewItems(items, existingLinks)
    expect(newItems).toHaveLength(2)
  })

  it('既存のものを除外', () => {
    const items: AWSWhatsNewItem[] = [
      {
        title: 'New Article',
        link: 'https://aws.amazon.com/new',
        pubDate: new Date(),
        content: 'Content',
        categories: ['EC2'],
        guid: 'new-guid',
      },
      {
        title: 'Existing Article',
        link: 'https://aws.amazon.com/existing',
        pubDate: new Date(),
        content: 'Content',
        categories: ['S3'],
        guid: 'existing-guid',
      },
    ]
    const existingLinks = ['https://aws.amazon.com/existing']

    const newItems = filterNewItems(items, existingLinks)
    expect(newItems).toHaveLength(1)
    expect(newItems[0].link).toBe('https://aws.amazon.com/new')
  })

  it('大文字小文字を区別せずに比較', () => {
    const items: AWSWhatsNewItem[] = [
      {
        title: 'Article',
        link: 'https://AWS.AMAZON.COM/Article',
        pubDate: new Date(),
        content: 'Content',
        categories: ['EC2'],
        guid: 'guid1',
      },
    ]
    const existingLinks = ['https://aws.amazon.com/article']

    const newItems = filterNewItems(items, existingLinks)
    expect(newItems).toHaveLength(0) // 大文字小文字が違っても同じとみなす
  })

  it('すべて既存の場合は空配列', () => {
    const items: AWSWhatsNewItem[] = [
      {
        title: 'Article 1',
        link: 'https://aws.amazon.com/article1',
        pubDate: new Date(),
        content: 'Content',
        categories: ['EC2'],
        guid: 'guid1',
      },
    ]
    const existingLinks = ['https://aws.amazon.com/article1']

    const newItems = filterNewItems(items, existingLinks)
    expect(newItems).toEqual([])
  })
})
