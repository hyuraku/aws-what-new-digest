import OpenAI from 'openai'
import type { AWSWhatsNewItem, SummaryResult } from './types.js'

const SYSTEM_PROMPT = `あなたはAWSの技術エキスパートです。AWS What's Newの記事を日本語で分かりやすく要約・解説してください。

以下の形式でJSON形式で出力してください:
{
  "overview": "概要（1-2文で簡潔に）",
  "details": "変更内容・新機能の詳細（技術的な説明を含む）",
  "impact": "影響範囲・利用シーン（どのようなユーザーに影響があるか）",
  "technicalNotes": "技術的な注意点（移行時の考慮事項、制限事項など）",
  "references": ["参考リンク1", "参考リンク2"]
}

ガイドライン:
- 技術的に正確で、クラウドエンジニアにとって有益な情報を含めてください
- 専門用語は適切に使用しつつ、必要に応じて補足説明を加えてください
- コストへの影響がある場合は言及してください
- リージョン制限がある場合は明記してください
- references配列は参考になる公式ドキュメントのURLがあれば記載、なければ空配列[]としてください`

/**
 * OpenAIクライアントを初期化
 * @returns OpenAI client
 */
export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  return new OpenAI({ apiKey })
}

/**
 * 記事の要約用プロンプトを生成
 * @param item - AWS What's New記事
 * @returns プロンプト文字列
 */
export function buildSummaryPrompt(item: AWSWhatsNewItem): string {
  return `以下のAWS What's New記事を要約・解説してください。

タイトル: ${item.title}
公開日: ${item.pubDate.toISOString().split('T')[0]}
カテゴリ: ${item.categories.join(', ')}
元記事URL: ${item.link}

内容:
${stripHtml(item.content)}

JSONフォーマットで出力してください。`
}

/**
 * HTMLタグを除去してプレーンテキストに変換
 * @param html - HTML文字列
 * @returns プレーンテキスト
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * OpenAIのレスポンスをパースしてSummaryResultに変換
 * @param content - OpenAIからのレスポンス文字列
 * @returns SummaryResult
 */
export function parseSummaryResponse(content: string): SummaryResult {
  // JSONブロックを抽出（```json ... ``` 形式の場合に対応）
  let jsonStr = content
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  try {
    const parsed = JSON.parse(jsonStr)
    return {
      overview: parsed.overview || '',
      details: parsed.details || '',
      impact: parsed.impact || '',
      technicalNotes: parsed.technicalNotes || '',
      references: Array.isArray(parsed.references) ? parsed.references : [],
    }
  } catch {
    // JSONパースに失敗した場合は、全文をoverviewとして扱う
    console.warn('Failed to parse JSON response, using raw content')
    return {
      overview: content.slice(0, 200),
      details: content,
      impact: '',
      technicalNotes: '',
      references: [],
    }
  }
}

/**
 * 単一の記事を要約
 * @param client - OpenAIクライアント
 * @param item - AWS What's New記事
 * @param model - 使用するモデル（デフォルト: gpt-4o-mini）
 * @returns SummaryResult
 */
export async function summarizeItem(
  client: OpenAI,
  item: AWSWhatsNewItem,
  model = 'gpt-4o-mini',
): Promise<SummaryResult> {
  const userPrompt = buildSummaryPrompt(item)

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_completion_tokens: 4000,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    // デバッグ: レスポンス全体を出力
    console.error('OpenAI response:', JSON.stringify(response, null, 2))
    throw new Error('Empty response from OpenAI')
  }

  return parseSummaryResponse(content)
}

/**
 * 複数の記事を並列で要約
 * @param items - AWS What's New記事の配列
 * @param model - 使用するモデル
 * @param concurrency - 並列実行数（デフォルト: 3）
 * @returns Map<guid, SummaryResult>
 */
export async function summarizeItems(
  items: AWSWhatsNewItem[],
  model = 'gpt-4o-mini',
  concurrency = 3,
): Promise<Map<string, SummaryResult>> {
  const client = createOpenAIClient()
  const results = new Map<string, SummaryResult>()

  // バッチ処理で並列実行
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          console.log(`Summarizing: ${item.title}`)
          const summary = await summarizeItem(client, item, model)
          return { guid: item.guid, summary }
        } catch (error) {
          console.error(`Failed to summarize "${item.title}":`, error)
          // エラー時はデフォルトの要約を返す
          return {
            guid: item.guid,
            summary: {
              overview: `${item.title}についての更新です。`,
              details: stripHtml(item.content).slice(0, 500),
              impact: '詳細は元記事をご確認ください。',
              technicalNotes: '',
              references: [],
            } as SummaryResult,
          }
        }
      }),
    )

    for (const result of batchResults) {
      results.set(result.guid, result.summary)
    }

    // レート制限対策: バッチ間で少し待機
    if (i + concurrency < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return results
}
