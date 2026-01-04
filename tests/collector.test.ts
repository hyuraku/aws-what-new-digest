import { describe, expect, it } from 'vitest'
import { convertRssItem, extractServiceNames, isWithin24Hours } from '../scripts/collector.js'

describe('isWithin24Hours', () => {
  it('24時間以内の記事はtrueを返す', () => {
    const now = new Date('2026-01-15T12:00:00Z')
    const pubDate = new Date('2026-01-15T00:00:00Z') // 12時間前
    expect(isWithin24Hours(pubDate, now)).toBe(true)
  })

  it('ちょうど24時間前の記事はtrueを返す', () => {
    const now = new Date('2026-01-15T12:00:00Z')
    const pubDate = new Date('2026-01-14T12:00:00Z') // ちょうど24時間前
    expect(isWithin24Hours(pubDate, now)).toBe(true)
  })

  it('24時間より古い記事はfalseを返す', () => {
    const now = new Date('2026-01-15T12:00:00Z')
    const pubDate = new Date('2026-01-14T11:00:00Z') // 25時間前
    expect(isWithin24Hours(pubDate, now)).toBe(false)
  })

  it('未来の日付はfalseを返す', () => {
    const now = new Date('2026-01-15T12:00:00Z')
    const pubDate = new Date('2026-01-15T13:00:00Z') // 1時間後
    expect(isWithin24Hours(pubDate, now)).toBe(false)
  })

  it('境界値: 23時間59分はtrueを返す', () => {
    const now = new Date('2026-01-15T12:00:00Z')
    const pubDate = new Date('2026-01-14T12:01:00Z') // 23時間59分前
    expect(isWithin24Hours(pubDate, now)).toBe(true)
  })
})

describe('extractServiceNames', () => {
  it('EC2のカテゴリを正しく抽出', () => {
    const categories = ['general:products/ec2']
    const services = extractServiceNames(categories)
    expect(services).toContain('EC2')
  })

  it('S3のカテゴリを正しく抽出', () => {
    const categories = ['general:products/amazon-s3']
    const services = extractServiceNames(categories)
    expect(services).toContain('S3')
  })

  it('複数のカテゴリを正しく抽出', () => {
    const categories = [
      'general:products/ec2',
      'general:products/amazon-s3',
      'general:products/lambda',
    ]
    const services = extractServiceNames(categories)
    expect(services).toEqual(expect.arrayContaining(['EC2', 'S3', 'Lambda']))
    expect(services.length).toBe(3)
  })

  it('重複するカテゴリを除外', () => {
    const categories = ['general:products/ec2', 'general:products/ec2', 'general:products/ec2']
    const services = extractServiceNames(categories)
    expect(services).toEqual(['EC2'])
  })

  it('空配列の場合はGeneralを返す', () => {
    const categories: string[] = []
    const services = extractServiceNames(categories)
    expect(services).toEqual(['General'])
  })

  it('認識できないカテゴリ形式の場合も適切に処理', () => {
    const categories = ['unknown-format', 'general:products/lambda']
    const services = extractServiceNames(categories)
    expect(services).toContain('Lambda')
  })

  it('カンマ区切りで複数カテゴリが入っていてもgeneral:productsのみ抽出', () => {
    const categories = ['general:products/aws-clean-rooms,marketing:marchitecture/analytics']
    const services = extractServiceNames(categories)
    expect(services).toEqual(['Clean Rooms'])
  })
})

describe('convertRssItem', () => {
  it('正常なRSSアイテムを変換', () => {
    const rssItem = {
      title: 'Amazon EC2 M8g instances now available',
      link: 'https://aws.amazon.com/about-aws/whats-new/2026/01/ec2-m8g-instances/',
      pubDate: '2026-01-15T10:00:00Z',
      content: '<p>New Graviton4-powered instances...</p>',
      categories: ['general:products/ec2'],
      guid: 'ec2-m8g-instances',
    }

    const item = convertRssItem(rssItem)

    expect(item.title).toBe('Amazon EC2 M8g instances now available')
    expect(item.link).toBe('https://aws.amazon.com/about-aws/whats-new/2026/01/ec2-m8g-instances/')
    expect(item.pubDate).toBeInstanceOf(Date)
    expect(item.pubDate.toISOString()).toBe('2026-01-15T10:00:00.000Z')
    expect(item.content).toBe('<p>New Graviton4-powered instances...</p>')
    expect(item.categories).toContain('EC2')
    expect(item.guid).toBe('ec2-m8g-instances')
  })

  it('タイトルがない場合はエラー', () => {
    const rssItem = {
      link: 'https://example.com',
      guid: 'test-guid',
    }

    expect(() => convertRssItem(rssItem)).toThrow()
  })

  it('リンクがない場合はエラー', () => {
    const rssItem = {
      title: 'Test Article',
      guid: 'test-guid',
    }

    expect(() => convertRssItem(rssItem)).toThrow()
  })

  it('GUIDがない場合はエラー', () => {
    const rssItem = {
      title: 'Test Article',
      link: 'https://example.com',
    }

    expect(() => convertRssItem(rssItem)).toThrow()
  })

  it('日付が不正な形式の場合はエラー', () => {
    const rssItem = {
      title: 'Test Article',
      link: 'https://example.com',
      pubDate: 'invalid-date',
      guid: 'test-guid',
    }

    expect(() => convertRssItem(rssItem)).toThrow()
  })
})
