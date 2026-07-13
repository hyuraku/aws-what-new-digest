/**
 * サービス別タグページの生成
 *
 * 既存の docs/YYYY/MM/DD.md を全件スキャンし、カテゴリ別に集約して
 * docs/services/{slug}.md を出力する。VitePress の build 前に実行する。
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  extractOneLineSummary,
  MIN_ARTICLES_FOR_PAGE,
  type NormalizedCategory,
  normalizeCategory,
} from './category-normalizer.js'
import { findAllDailyMarkdowns } from './lib/daily-files.js'
import { extractEntriesFromMarkdown, readMarkdownFile } from './markdown-generator.js'

interface ServiceArticle {
  date: string // YYYY-MM-DD
  dailyPath: string // /YYYY/MM/DD
  title: string
  link: string
  oneLine: string
}

interface ServiceBucket {
  display: string
  slug: string
  articles: ServiceArticle[]
}

const DOCS_DIR = 'docs'
const SERVICES_DIR = 'docs/services'

/**
 * 日次Markdownのファイルパス（docs/2026/04/12.md）から
 * サイト内リンクパス（/2026/04/12）を作る
 */
function dailyPathToSiteLink(filePath: string): string {
  const m = filePath.match(/(\d{4})\/(\d{2})\/(\d{2})\.md$/)
  if (!m) return '/'
  return `/${m[1]}/${m[2]}/${m[3]}`
}

/**
 * 全Markdownを読み込み、カテゴリ別にバケットへ振り分ける
 */
async function buildServiceBuckets(docsDir: string): Promise<Map<string, ServiceBucket>> {
  const buckets = new Map<string, ServiceBucket>()
  const files = await findAllDailyMarkdowns(docsDir)

  for (const file of files) {
    const content = await readMarkdownFile(file)
    if (!content) continue
    const entries = extractEntriesFromMarkdown(content)
    const dailyPath = dailyPathToSiteLink(file)

    for (const entry of entries) {
      const article: ServiceArticle = {
        date: entry.date,
        dailyPath,
        title: entry.title,
        link: entry.link,
        oneLine: extractOneLineSummary(entry.summary.overview),
      }

      const normalized = entry.categories
        .map((c) => normalizeCategory(c))
        .filter((n): n is NormalizedCategory => n !== null)

      // 同一記事が同じバケットに重複しないよう slug でユニーク化
      const seenSlugs = new Set<string>()
      for (const cat of normalized) {
        if (seenSlugs.has(cat.slug)) continue
        seenSlugs.add(cat.slug)

        let bucket = buckets.get(cat.slug)
        if (!bucket) {
          bucket = { display: cat.display, slug: cat.slug, articles: [] }
          buckets.set(cat.slug, bucket)
        }
        bucket.articles.push(article)
      }
    }
  }

  // 各バケット内を新しい順に並べる
  for (const bucket of buckets.values()) {
    bucket.articles.sort((a, b) => b.date.localeCompare(a.date))
  }
  return buckets
}

/**
 * 1サービス分のMarkdownページを描画
 */
function renderServicePage(bucket: ServiceBucket): string {
  const lines: string[] = []
  lines.push('---')
  lines.push(`title: ${bucket.display} - AWS What's New Digest`)
  lines.push(`description: ${bucket.display}に関するAWSの最新アップデート一覧`)
  lines.push('---')
  lines.push('')
  lines.push(`# ${bucket.display}`)
  lines.push('')
  lines.push(`${bucket.display} に関する更新 ${bucket.articles.length} 件。`)
  lines.push('')

  for (const a of bucket.articles) {
    lines.push(`## ${a.title}`)
    lines.push('')
    lines.push(`- **日付**: [${a.date}](${a.dailyPath})`)
    lines.push(`- **元記事**: ${a.link}`)
    if (a.oneLine) {
      lines.push('')
      lines.push(a.oneLine)
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * サービス一覧（ハブ）ページを描画
 */
function renderIndexPage(buckets: ServiceBucket[]): string {
  const lines: string[] = []
  lines.push('---')
  lines.push("title: サービス別 - AWS What's New Digest")
  lines.push('description: AWSサービス別の更新アーカイブ')
  lines.push('---')
  lines.push('')
  lines.push('# サービス別アーカイブ')
  lines.push('')
  lines.push(`${buckets.length} サービスのアップデートを集計しています。`)
  lines.push('')

  // 件数の多い順
  const sorted = [...buckets].sort((a, b) => b.articles.length - a.articles.length)
  for (const b of sorted) {
    lines.push(`- [${b.display}](/services/${b.slug}) (${b.articles.length})`)
  }
  lines.push('')
  return lines.join('\n')
}

async function main() {
  console.log('[generate-service-pages] scanning docs/...')
  const buckets = await buildServiceBuckets(DOCS_DIR)

  // 件数閾値でフィルタ
  const eligible = [...buckets.values()].filter((b) => b.articles.length >= MIN_ARTICLES_FOR_PAGE)
  console.log(
    `[generate-service-pages] ${buckets.size} categories found, ${eligible.length} pass threshold (>= ${MIN_ARTICLES_FOR_PAGE})`,
  )

  await mkdir(SERVICES_DIR, { recursive: true })

  // 個別サービスページ
  for (const bucket of eligible) {
    const filePath = join(SERVICES_DIR, `${bucket.slug}.md`)
    await writeFile(filePath, renderServicePage(bucket), 'utf-8')
  }

  // ハブページ
  const indexPath = join(SERVICES_DIR, 'index.md')
  await writeFile(indexPath, renderIndexPage(eligible), 'utf-8')

  // サイドバー用マニフェスト（slug → display + count）
  const manifest = eligible
    .slice()
    .sort((a, b) => a.display.localeCompare(b.display))
    .map((b) => ({ slug: b.slug, display: b.display, count: b.articles.length }))
  await writeFile(join(SERVICES_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')

  console.log(`[generate-service-pages] wrote ${eligible.length + 1} files to ${SERVICES_DIR}/`)
}

main().catch((err) => {
  console.error('[generate-service-pages] failed:', err)
  process.exit(1)
})

export { buildServiceBuckets, dailyPathToSiteLink, renderIndexPage, renderServicePage }
