import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { generateDailyFilePath } from './markdown-generator.js'
import type { AWSWhatsNewItem } from './types.js'

/**
 * 直近N日分の日付リストを生成
 * @param baseDate - 基準日
 * @param days - 遡る日数
 * @returns 日付の配列（新しい順）
 */
export function getRecentDates(baseDate: Date, days: number): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() - i)
    dates.push(date)
  }
  return dates
}

/**
 * Markdownコンテンツからすべてのリンクを抽出
 * リンクはMarkdown形式 **リンク**: https://... で記載されている
 * @param content - Markdownファイルの内容
 * @returns リンクの配列
 */
export function extractLinksFromMarkdown(content: string): string[] {
  const links = new Set<string>()

  // パターン: "- **リンク**: https://..."
  const pattern = /\*\*リンク\*\*:\s*(https?:\/\/[^\s\n]+)/g

  for (const match of content.matchAll(pattern)) {
    links.add(match[1])
  }

  return Array.from(links)
}

/**
 * 新規記事のみをフィルタリング
 * 既存のリンクと照合して、まだ処理されていない記事のみを返す
 * @param items - RSSから取得した記事リスト
 * @param existingLinks - 既存の記事のリンク
 * @returns 新規記事のみの配列
 */
export function filterNewItems(
  items: AWSWhatsNewItem[],
  existingLinks: string[],
): AWSWhatsNewItem[] {
  // 大文字小文字を区別しないためにすべて小文字に変換したSetを作成
  const existingLinksLower = new Set(existingLinks.map((link) => link.toLowerCase()))

  return items.filter((item) => {
    const linkLower = item.link.toLowerCase()
    return !existingLinksLower.has(linkLower)
  })
}

/**
 * ファイルが存在するか確認
 * @param filePath - ファイルパス
 * @returns 存在すればtrue
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * 直近N日分のMarkdownファイルから既存のリンクを収集
 * @param baseDate - 基準日
 * @param days - 遡る日数
 * @param basePath - ベースパス（デフォルト: カレントディレクトリ）
 * @returns 既存リンクの配列
 */
export async function collectExistingLinks(
  baseDate: Date,
  days: number,
  basePath = '.',
): Promise<string[]> {
  const allLinks = new Set<string>()
  const dates = getRecentDates(baseDate, days)

  for (const date of dates) {
    const relativePath = generateDailyFilePath(date)
    const fullPath = join(basePath, relativePath)

    if (await fileExists(fullPath)) {
      try {
        const content = await readFile(fullPath, 'utf-8')
        const links = extractLinksFromMarkdown(content)
        for (const link of links) {
          allLinks.add(link)
        }
      } catch (error) {
        console.warn(`Failed to read ${fullPath}:`, error)
      }
    }
  }

  console.log(`Collected ${allLinks.size} existing links from last ${days} days`)
  return Array.from(allLinks)
}

/**
 * 重複を除外した新規記事を取得
 * @param items - RSSから取得した記事リスト
 * @param baseDate - 基準日
 * @param days - 重複チェックの対象日数
 * @param basePath - ベースパス
 * @returns 新規記事のみの配列
 */
export async function getNewItemsOnly(
  items: AWSWhatsNewItem[],
  baseDate: Date,
  days: number,
  basePath = '.',
): Promise<AWSWhatsNewItem[]> {
  const existingLinks = await collectExistingLinks(baseDate, days, basePath)
  const newItems = filterNewItems(items, existingLinks)

  console.log(`Found ${newItems.length} new items out of ${items.length} total`)
  return newItems
}
