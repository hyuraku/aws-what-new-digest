import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { MarkdownEntry } from './types.js'

/**
 * 日別ファイルパスを生成
 * @param date - 日付
 * @returns ファイルパス（例: docs/2026/01/15.md）
 */
export function generateDailyFilePath(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `docs/${year}/${month}/${day}.md`
}

/**
 * 日付を日本語形式でフォーマット
 * @param date - 日付
 * @returns フォーマットされた日付文字列（例: 2026年01月15日）
 */
export function formatDateJapanese(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

/**
 * テキストをMarkdownリスト形式に変換
 * AIが出力する「・項目名: 説明\n・項目名: 説明」形式を
 * 「- **項目名**: 説明」のMarkdownリストに変換する
 * @param text - 変換対象のテキスト
 * @returns Markdown形式のリスト
 */
function formatAsMarkdownList(text: string): string {
  if (!text || text === '特になし') {
    return '特になし'
  }

  // リテラルな \n を実際の改行に変換
  let formatted = text.replace(/\\n/g, '\n')

  // 「・項目名:」形式を「- **項目名**:」形式に変換
  formatted = formatted.replace(/^・([^:：]+)[:：]\s*/gm, '- **$1**: ')

  // 行頭が「・」で始まる場合（コロンなし）も箇条書きに変換
  formatted = formatted.replace(/^・/gm, '- ')

  // 連続する空行を1つに
  formatted = formatted.replace(/\n{3,}/g, '\n\n')

  return formatted.trim()
}

/**
 * 単一の記事エントリをMarkdown形式に変換
 * @param entry - Markdownエントリ
 * @returns Markdown形式の文字列
 */
function formatEntry(entry: MarkdownEntry): string {
  const lines: string[] = []

  // タイトル（カテゴリ付き）
  lines.push(`## [${entry.categories.join(', ')}] ${entry.title}`)
  lines.push('')

  // メタデータ
  lines.push(`- **公開日**: ${entry.date} (JST)`)
  lines.push(`- **カテゴリ**: ${entry.categories.join(', ')}`)
  lines.push(`- **リンク**: ${entry.link}`)
  lines.push('')

  // 概要
  lines.push('### 概要')
  lines.push('')
  lines.push(entry.summary.overview)
  lines.push('')

  // 変更内容・新機能の詳細
  lines.push('### 変更内容・新機能の詳細')
  lines.push('')
  lines.push(entry.summary.details)
  lines.push('')

  // 影響範囲・利用シーン
  lines.push('### 影響範囲・利用シーン')
  lines.push('')
  lines.push(formatAsMarkdownList(entry.summary.impact))
  lines.push('')

  // 技術的な注意点
  lines.push('### 技術的な注意点')
  lines.push('')
  lines.push(formatAsMarkdownList(entry.summary.technicalNotes || ''))
  lines.push('')

  // 参考情報（存在する場合のみ）
  if (entry.summary.references && entry.summary.references.length > 0) {
    lines.push('### 参考情報')
    lines.push('')
    for (const ref of entry.summary.references) {
      lines.push(`- ${ref}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Markdownコンテンツを生成
 * @param date - 日付
 * @param entries - その日の記事リスト（空配列の場合は「更新なし」を表示）
 * @returns Markdownコンテンツ
 */
export function generateMarkdownContent(date: Date, entries: MarkdownEntry[]): string {
  const lines: string[] = []

  // ページタイトル
  lines.push(`# ${formatDateJapanese(date)}`)
  lines.push('')

  if (entries.length === 0) {
    // 記事がない場合
    lines.push("本日はAWS What's Newの更新はありませんでした。")
    lines.push('')
  } else {
    // 記事がある場合
    for (let i = 0; i < entries.length; i++) {
      lines.push(formatEntry(entries[i]))

      // 最後の記事以外は区切り線を追加
      if (i < entries.length - 1) {
        lines.push('---')
        lines.push('')
      }
    }
  }

  return lines.join('\n')
}

/**
 * Markdownファイルを保存
 * @param date - 日付
 * @param entries - 記事エントリのリスト
 * @param basePath - ベースパス（デフォルト: カレントディレクトリ）
 * @returns 保存したファイルパス
 */
export async function saveMarkdownFile(
  date: Date,
  entries: MarkdownEntry[],
  basePath = '.',
): Promise<string> {
  const relativePath = generateDailyFilePath(date)
  const fullPath = join(basePath, relativePath)

  // ディレクトリを作成
  await mkdir(dirname(fullPath), { recursive: true })

  // Markdownコンテンツを生成して保存
  const content = generateMarkdownContent(date, entries)
  await writeFile(fullPath, content, 'utf-8')

  console.log(`Saved: ${fullPath} (${entries.length} entries)`)
  return fullPath
}

/**
 * 既存のMarkdownファイルを読み込む
 * @param filePath - ファイルパス
 * @returns ファイルの内容（存在しない場合はnull）
 */
export async function readMarkdownFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

/**
 * 日付に対応するMarkdownファイルが存在するかチェック
 * @param date - 日付
 * @param basePath - ベースパス（デフォルト: カレントディレクトリ）
 * @returns ファイルが存在すればtrue
 */
export async function dailyFileExists(date: Date, basePath = '.'): Promise<boolean> {
  const relativePath = generateDailyFilePath(date)
  const fullPath = join(basePath, relativePath)
  const content = await readMarkdownFile(fullPath)
  return content !== null
}

/**
 * 既存のMarkdownファイルに記事を追加
 * @param date - 日付
 * @param newEntries - 追加する記事エントリ
 * @param existingEntries - 既存の記事エントリ
 * @param basePath - ベースパス
 * @returns 保存したファイルパス
 */
export async function appendToMarkdownFile(
  date: Date,
  newEntries: MarkdownEntry[],
  existingEntries: MarkdownEntry[],
  basePath = '.',
): Promise<string> {
  // 既存エントリと新規エントリを結合（新しいものが上に来るようにソート）
  const allEntries = [...newEntries, ...existingEntries]

  return saveMarkdownFile(date, allEntries, basePath)
}
