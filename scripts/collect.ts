import 'dotenv/config'
import { join } from 'node:path'
import { format } from 'date-fns'
import { collectRecentItems } from './collector.js'
import { getNewItemsOnly } from './duplicate-checker.js'
import {
  appendToMarkdownFile,
  dailyFileExists,
  extractEntriesFromMarkdown,
  generateDailyFilePath,
  readMarkdownFile,
  saveMarkdownFile,
} from './markdown-generator.js'
import { summarizeItems } from './summarizer.js'
import { toJST } from './timezone.js'
import type { AWSWhatsNewItem, MarkdownEntry, SummaryResult } from './types.js'

// 設定
const DUPLICATE_CHECK_DAYS = Number.parseInt(process.env.DUPLICATE_CHECK_DAYS || '7', 10)
const AI_MODEL = process.env.AI_MODEL || 'gpt-5-mini'

/**
 * AWSWhatsNewItemとSummaryResultからMarkdownEntryを作成
 */
function createMarkdownEntry(item: AWSWhatsNewItem, summary: SummaryResult): MarkdownEntry {
  return {
    title: item.title,
    date: format(toJST(item.pubDate), 'yyyy-MM-dd'),
    link: item.link,
    categories: item.categories,
    guid: item.guid,
    summary,
  }
}

/**
 * 日付ごとに記事をグループ化（JST基準）
 */
function groupItemsByDate(items: AWSWhatsNewItem[]): Map<string, AWSWhatsNewItem[]> {
  const groups = new Map<string, AWSWhatsNewItem[]>()

  for (const item of items) {
    const dateKey = format(toJST(item.pubDate), 'yyyy-MM-dd')
    const existing = groups.get(dateKey) || []
    existing.push(item)
    groups.set(dateKey, existing)
  }

  return groups
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  console.log("=== AWS What's New Digest Collector ===")
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`Duplicate check days: ${DUPLICATE_CHECK_DAYS}`)
  console.log(`AI Model: ${AI_MODEL}`)
  console.log('')

  try {
    // 1. RSSフィードから最新記事を取得
    console.log('Step 1: Fetching RSS feed...')
    const recentItems = await collectRecentItems()

    if (recentItems.length === 0) {
      console.log('No recent items found in RSS feed.')
      // 当日のファイルが存在しない場合のみ「更新なし」ファイルを作成
      const today = new Date()
      if (!(await dailyFileExists(today))) {
        await saveMarkdownFile(today, [])
        console.log('Created empty file for today.')
      } else {
        console.log('File already exists, skipping.')
      }
      return
    }

    console.log(`Found ${recentItems.length} items from last 24 hours`)
    console.log('')

    // 2. 重複を除外
    console.log('Step 2: Checking for duplicates...')
    const now = new Date()
    const newItems = await getNewItemsOnly(recentItems, now, DUPLICATE_CHECK_DAYS)

    if (newItems.length === 0) {
      console.log('All items are already processed.')
      // 当日のファイルが存在しない場合のみ「更新なし」ファイルを作成
      if (!(await dailyFileExists(now))) {
        await saveMarkdownFile(now, [])
        console.log('Created empty file for today.')
      } else {
        console.log('File already exists, skipping.')
      }
      return
    }

    console.log(`${newItems.length} new items to process`)
    console.log('')

    // 3. AI要約を生成
    console.log('Step 3: Generating AI summaries...')
    const summaries = await summarizeItems(newItems, AI_MODEL)
    console.log(`Generated ${summaries.size} summaries`)
    console.log('')

    // 4. 日付ごとにMarkdownファイルを生成
    console.log('Step 4: Generating Markdown files...')
    const groupedItems = groupItemsByDate(newItems)

    for (const [dateKey, items] of groupedItems) {
      const entries: MarkdownEntry[] = []

      for (const item of items) {
        const summary = summaries.get(item.guid)
        if (summary) {
          entries.push(createMarkdownEntry(item, summary))
        }
      }

      // 日付文字列からDateオブジェクトを作成
      const date = new Date(dateKey)

      // 既存ファイルがあれば読み込んでエントリを抽出し、追記する
      const filePath = join('.', generateDailyFilePath(date))
      const existingContent = await readMarkdownFile(filePath)

      if (existingContent) {
        const existingEntries = extractEntriesFromMarkdown(existingContent)
        // 重複を除去（リンクで比較）
        const existingLinks = new Set(existingEntries.map((e) => e.link.toLowerCase()))
        const uniqueNewEntries = entries.filter((e) => !existingLinks.has(e.link.toLowerCase()))

        if (uniqueNewEntries.length > 0) {
          await appendToMarkdownFile(date, uniqueNewEntries, existingEntries)
          console.log(`Appended ${uniqueNewEntries.length} entries to ${filePath}`)
        } else {
          console.log(`No new entries to add to ${filePath}`)
        }
      } else {
        await saveMarkdownFile(date, entries)
        console.log(`Created ${filePath} with ${entries.length} entries`)
      }
    }

    console.log('')
    console.log('=== Collection completed successfully ===')
    console.log(`Processed ${newItems.length} new items`)
  } catch (error) {
    console.error('Error during collection:', error)
    process.exit(1)
  }
}

// 実行
main()
