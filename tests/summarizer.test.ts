import { describe, expect, it } from 'vitest'
import {
  buildSummaryPrompt,
  escapeForMarkdown,
  parseSummaryResponse,
  stripHtml,
} from '../scripts/summarizer.js'
import type { AWSWhatsNewItem } from '../scripts/types.js'

describe('parseSummaryResponse', () => {
  it('正常なJSONをパースしてSummaryResultを返す', () => {
    const content = JSON.stringify({
      overview: '概要です。',
      details: '詳細です。',
      impact: '・対象ユーザー: 開発者',
      technicalNotes: '特になし',
      references: ['https://docs.aws.amazon.com/example'],
    })

    const result = parseSummaryResponse(content)

    expect(result.overview).toBe('概要です。')
    expect(result.details).toBe('詳細です。')
    expect(result.impact).toBe('・対象ユーザー: 開発者')
    expect(result.technicalNotes).toBe('特になし')
    expect(result.references).toEqual(['https://docs.aws.amazon.com/example'])
  })

  it('コードフェンス（```json）付きのJSONをパースできる', () => {
    const content = '```json\n{"overview": "フェンス付き概要", "details": "詳細"}\n```'

    const result = parseSummaryResponse(content)

    expect(result.overview).toBe('フェンス付き概要')
    expect(result.details).toBe('詳細')
  })

  it('言語指定なしのコードフェンスもパースできる', () => {
    const content = '```\n{"overview": "言語指定なし"}\n```'

    const result = parseSummaryResponse(content)

    expect(result.overview).toBe('言語指定なし')
  })

  it('壊れたJSONの場合は全文をフォールバックとして扱う', () => {
    const content = 'これはJSONではないプレーンテキストの応答です。'

    const result = parseSummaryResponse(content)

    expect(result.overview).toBe(content.slice(0, 200))
    expect(result.details).toBe(content)
    expect(result.impact).toBe('')
    expect(result.technicalNotes).toBe('')
    expect(result.references).toEqual([])
  })

  it('壊れたJSONで200文字を超える場合はoverviewを切り詰める', () => {
    const content = `あ${'い'.repeat(300)}`

    const result = parseSummaryResponse(content)

    expect(result.overview).toHaveLength(200)
    expect(result.details).toBe(content)
  })

  it('フィールド欠落時は空文字・空配列で補完する', () => {
    const result = parseSummaryResponse('{"overview": "概要のみ"}')

    expect(result.overview).toBe('概要のみ')
    expect(result.details).toBe('')
    expect(result.impact).toBe('')
    expect(result.technicalNotes).toBe('')
    expect(result.references).toEqual([])
  })

  it('referencesが配列でない場合は空配列にする', () => {
    const result = parseSummaryResponse('{"overview": "x", "references": "not-an-array"}')

    expect(result.references).toEqual([])
  })
})

describe('stripHtml', () => {
  it('HTMLタグを除去してプレーンテキストを返す', () => {
    expect(stripHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World')
  })

  it('HTMLエンティティをデコードする', () => {
    expect(stripHtml('a &amp; b &quot;c&quot; &#39;d&#39;')).toBe('a & b "c" \'d\'')
  })

  it('エンティティ化されたタグ（&lt;script&gt;）もデコード後に除去する', () => {
    expect(stripHtml('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe('alert(1)')
  })

  it('ネストしたタグ構造を繰り返し除去する', () => {
    expect(stripHtml('<div><p><span>nested</span></p></div>')).toBe('nested')
  })

  it('javascript:などの危険なプロトコルを除去する', () => {
    expect(stripHtml('click javascript:alert(1)')).toBe('click alert(1)')
    expect(stripHtml('DATA:text/html')).toBe('text/html')
    expect(stripHtml('vbscript:foo')).toBe('foo')
  })

  it('連続する空白を1つにまとめてトリムする', () => {
    expect(stripHtml('  a \n\n b\t c  ')).toBe('a b c')
  })

  it('タグのない文字列はそのまま返す', () => {
    expect(stripHtml('plain text')).toBe('plain text')
  })
})

describe('escapeForMarkdown', () => {
  it('< と > をHTMLエンティティにエスケープする', () => {
    expect(escapeForMarkdown('a < b > c')).toBe('a &lt; b &gt; c')
  })

  it('エスケープ対象がなければそのまま返す', () => {
    expect(escapeForMarkdown('normal text')).toBe('normal text')
  })
})

describe('buildSummaryPrompt', () => {
  it('記事のタイトル・日付・カテゴリ・URLを含むプロンプトを生成する', () => {
    const item: AWSWhatsNewItem = {
      title: 'Amazon EC2 new instances',
      link: 'https://aws.amazon.com/about-aws/whats-new/2026/01/example/',
      pubDate: new Date('2026-01-15T12:00:00Z'),
      content: '<p>New instance types are available.</p>',
      categories: ['EC2', 'Compute'],
      guid: 'example-guid',
    }

    const prompt = buildSummaryPrompt(item)

    expect(prompt).toContain('タイトル: Amazon EC2 new instances')
    expect(prompt).toContain('公開日: 2026-01-15')
    expect(prompt).toContain('カテゴリ: EC2, Compute')
    expect(prompt).toContain(
      '元記事URL: https://aws.amazon.com/about-aws/whats-new/2026/01/example/',
    )
    // HTMLタグは除去された状態で含まれる
    expect(prompt).toContain('New instance types are available.')
    expect(prompt).not.toContain('<p>')
  })
})
