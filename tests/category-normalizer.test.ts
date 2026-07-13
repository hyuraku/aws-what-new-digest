import { describe, expect, it } from 'vitest'
import { extractOneLineSummary, normalizeCategory, toSlug } from '../scripts/category-normalizer.js'

describe('normalizeCategory', () => {
  it('DISPLAY_NAME_MAPにある表記揺れを公式表記に正規化する', () => {
    expect(normalizeCategory('Ec2')).toEqual({ display: 'EC2', slug: 'ec2' })
    expect(normalizeCategory('Sagemaker')).toEqual({ display: 'SageMaker', slug: 'sagemaker' })
    expect(normalizeCategory('Iot Device Management')).toEqual({
      display: 'IoT Device Management',
      slug: 'iot-device-management',
    })
  })

  it('マップにない名前はそのままの表示名でスラグ化する', () => {
    expect(normalizeCategory('Lambda')).toEqual({ display: 'Lambda', slug: 'lambda' })
    expect(normalizeCategory('API Gateway')).toEqual({
      display: 'API Gateway',
      slug: 'api-gateway',
    })
  })

  it('前後の空白をトリムしてから正規化する', () => {
    expect(normalizeCategory('  Ec2  ')).toEqual({ display: 'EC2', slug: 'ec2' })
  })

  it('除外カテゴリ（General等）はnullを返す', () => {
    expect(normalizeCategory('General')).toBeNull()
    expect(normalizeCategory('Advance Pay')).toBeNull()
  })

  it('空文字・空白のみはnullを返す', () => {
    expect(normalizeCategory('')).toBeNull()
    expect(normalizeCategory('   ')).toBeNull()
  })
})

describe('toSlug', () => {
  it('小文字化してスペースをハイフンに変換する', () => {
    expect(toSlug('API Gateway')).toBe('api-gateway')
  })

  it('ピリオドなどの記号もハイフンに変換する', () => {
    expect(toSlug('AppStream 2.0')).toBe('appstream-2-0')
  })

  it('括弧は除去する', () => {
    expect(toSlug('GovCloud (US)')).toBe('govcloud-us')
  })

  it('先頭・末尾のハイフンを除去する', () => {
    expect(toSlug('  FSx for NetApp ONTAP ')).toBe('fsx-for-netapp-ontap')
  })
})

describe('extractOneLineSummary', () => {
  it('最初の句点までを抽出する', () => {
    expect(extractOneLineSummary('1文目です。2文目です。')).toBe('1文目です。')
  })

  it('英文ピリオドや感嘆符でも区切る', () => {
    expect(extractOneLineSummary('First sentence. Second.')).toBe('First sentence.')
    expect(extractOneLineSummary('すごい！続きの文。')).toBe('すごい！')
  })

  it('改行や連続空白を1つの空白にまとめる', () => {
    expect(extractOneLineSummary('前半\n\n後半の文。')).toBe('前半 後半の文。')
  })

  it('句点がない場合は全文を返す', () => {
    expect(extractOneLineSummary('句点なしの短いテキスト')).toBe('句点なしの短いテキスト')
  })

  it('maxLengthを超える場合は切り詰めて…を付ける', () => {
    const long = 'あ'.repeat(200)
    const result = extractOneLineSummary(long, 120)
    expect(result).toHaveLength(120)
    expect(result.endsWith('…')).toBe(true)
  })

  it('空入力・空白のみは空文字を返す', () => {
    expect(extractOneLineSummary('')).toBe('')
    expect(extractOneLineSummary('   ')).toBe('')
  })
})
