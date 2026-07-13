import OpenAI from 'openai'
import type { AWSWhatsNewItem, SummaryResult } from './types.js'

/** 要約に使うOpenAIモデルのデフォルト（環境変数 AI_MODEL で上書き可能） */
export const DEFAULT_AI_MODEL = 'gpt-5-mini'

const SYSTEM_PROMPT = `あなたはAWSの技術エキスパートです。AWS What's Newの記事を日本語で分かりやすく要約・解説してください。

以下の形式でJSON形式で出力してください:
{
  "overview": "概要（1-2文で簡潔に）",
  "details": "変更内容・新機能の詳細（技術的な説明を含む）",
  "impact": "影響範囲・利用シーン（下記フォーマット必須）",
  "technicalNotes": "技術的な注意点（下記フォーマット必須）",
  "references": ["参考リンク1", "参考リンク2"]
}

impactのフォーマット（厳守）:
- 必ず「・項目名: 説明」の形式で記述してください
- 各項目は改行（\\n）で区切ってください
- 必須項目: 対象ユーザー、利用シーンまたは効果
- 例: "・対象ユーザー: データ分析者、SRE/運用チーム\\n・利用シーン: キャンペーン効果測定のクエリ監視\\n・運用効果: パフォーマンス問題の早期検出が可能"

technicalNotesのフォーマット（厳守）:
- 必ず「・項目名: 説明」の形式で記述してください
- 各項目は改行（\\n）で区切ってください
- 例: "・IAM権限: 必要な権限を事前に確認してください\\n・リージョン制限: 東京リージョンでは未対応です\\n・コスト: 追加料金が発生する可能性があります"
- 注意点がない場合は "特になし" としてください

ガイドライン:
- 技術的に正確で、クラウドエンジニアにとって有益な情報を含めてください
- 専門用語は適切に使用しつつ、必要に応じて補足説明を加えてください
- コストへの影響がある場合は言及してください
- リージョン制限がある場合は明記してください
- references配列は参考になる公式ドキュメントのURLがあれば記載、なければ空配列[]としてください`

/**
 * OpenAI APIキーのフォーマットを検証
 * @param apiKey - 検証するAPIキー
 * @returns 検証結果
 */
function validateApiKeyFormat(apiKey: string): boolean {
  // OpenAI APIキーは "sk-" または "sk-proj-" で始まる
  if (!apiKey.startsWith('sk-')) {
    return false
  }
  // 長さの妥当性チェック（通常51文字以上、200文字以下）
  if (apiKey.length < 20 || apiKey.length > 200) {
    return false
  }
  return true
}

/**
 * OpenAIクライアントを初期化
 * @returns OpenAI client
 */
export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  if (!validateApiKeyFormat(apiKey)) {
    throw new Error('OPENAI_API_KEY format is invalid')
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
 * HTMLタグを除去してプレーンテキストに変換（セキュア実装）
 * @param html - HTML文字列
 * @returns プレーンテキスト
 */
export function stripHtml(html: string): string {
  let text = html

  // HTMLエンティティをデコード
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

  // すべてのHTMLタグを除去（ネスト対応のため繰り返し）
  let prev = ''
  while (prev !== text) {
    prev = text
    text = text.replace(/<[^>]*>/g, ' ')
  }

  // 危険なプロトコルを除去
  text = text.replace(/javascript:/gi, '')
  text = text.replace(/data:/gi, '')
  text = text.replace(/vbscript:/gi, '')

  // 連続する空白を1つに
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Markdownに埋め込む際の危険な文字をエスケープ
 * @param text - エスケープするテキスト
 * @returns エスケープされたテキスト
 */
export function escapeForMarkdown(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
 * @param model - 使用するモデル（デフォルト: DEFAULT_AI_MODEL）
 * @returns SummaryResult
 */
export async function summarizeItem(
  client: OpenAI,
  item: AWSWhatsNewItem,
  model = DEFAULT_AI_MODEL,
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
    // セキュリティ: レスポンス全体をログに出力しない（APIキー漏洩防止）
    console.error('OpenAI returned empty response for:', item.title)
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
  model = DEFAULT_AI_MODEL,
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
