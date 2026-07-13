/**
 * OG画像の生成
 *
 * 各日次ページとサービス別ページに対し PNG を docs/public/og/ に出力する。
 * テキストは ASCII のみ（日本語フォントを避けるため日付は YYYY-MM-DD で表示）。
 *
 * 出力ファイル名:
 *   日次:   docs/public/og/daily-YYYY-MM-DD.png
 *   サービス: docs/public/og/service-{slug}.png
 *   デフォルト: docs/public/og/default.png
 *
 * これらは VitePress ビルド時に static asset としてコピーされ
 * config.ts の transformPageData が og:image メタタグを差し込む。
 */
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import { extractEntriesFromMarkdown, readMarkdownFile } from './markdown-generator.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DOCS_DIR = 'docs'
const OG_DIR = 'docs/public/og'
const FONT_REGULAR = join(
  __dirname,
  '..',
  'node_modules/@fontsource/inter/files/inter-latin-400-normal.woff',
)
const FONT_BOLD = join(
  __dirname,
  '..',
  'node_modules/@fontsource/inter/files/inter-latin-800-normal.woff',
)

const WIDTH = 1200
const HEIGHT = 630
const BRAND_COLOR = '#f59e0b' // theme-color と一致
const BG = '#0f172a'
const FG = '#f1f5f9'
const SUBTLE = '#94a3b8'

interface OgInput {
  eyebrow: string // 上部の小さい見出し（例: "2026-04-12 (JST)"）
  title: string // メインの大見出し（例: "Bedrock", "12 updates"）
  caption: string // 下部のキャプション（例: "12 AWS updates"）
}

/**
 * Satori 用のテンプレート（JSXではなくオブジェクトリテラル）
 */
function template({ eyebrow, title, caption }: OgInput) {
  return {
    type: 'div',
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: `linear-gradient(135deg, ${BG} 0%, #1e293b 100%)`,
        padding: '64px',
        fontFamily: 'Inter',
        color: FG,
      },
      children: [
        // header band
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: 16 },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    width: 16,
                    height: 48,
                    background: BRAND_COLOR,
                    borderRadius: 4,
                  },
                },
              },
              {
                type: 'div',
                props: {
                  style: { fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' },
                  children: "AWS What's New Digest",
                },
              },
            ],
          },
        },
        // title block
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap: 16 },
            children: [
              {
                type: 'div',
                props: {
                  style: { fontSize: 28, color: BRAND_COLOR, fontWeight: 800 },
                  children: eyebrow,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 84,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    letterSpacing: '-0.03em',
                    color: FG,
                  },
                  children: title,
                },
              },
            ],
          },
        },
        // footer
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 22,
              color: SUBTLE,
            },
            children: [
              { type: 'div', props: { children: caption } },
              { type: 'div', props: { children: 'hyuraku.github.io' } },
            ],
          },
        },
      ],
    },
  }
}

async function loadFonts() {
  const [regular, bold] = await Promise.all([readFile(FONT_REGULAR), readFile(FONT_BOLD)])
  return [
    { name: 'Inter', data: regular, weight: 400 as const, style: 'normal' as const },
    { name: 'Inter', data: bold, weight: 800 as const, style: 'normal' as const },
  ]
}

async function renderPng(input: OgInput, fonts: Awaited<ReturnType<typeof loadFonts>>) {
  const svg = await satori(template(input) as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  })
  const png = new Resvg(svg).render().asPng()
  return png
}

/**
 * 出力PNGがソース（.md）より新しいなら true（再生成スキップ可）
 */
async function isUpToDate(outPath: string, srcPath?: string): Promise<boolean> {
  try {
    const outStat = await stat(outPath)
    if (!srcPath) return true // sourceが無いなら存在チェックのみ
    const srcStat = await stat(srcPath)
    return outStat.mtimeMs >= srcStat.mtimeMs
  } catch {
    return false
  }
}

async function findAllDailyMarkdowns(): Promise<string[]> {
  const result: string[] = []
  const yearDirs = await readdir(DOCS_DIR)
  for (const year of yearDirs) {
    if (!/^\d{4}$/.test(year)) continue
    const yearPath = join(DOCS_DIR, year)
    if (!(await stat(yearPath)).isDirectory()) continue
    for (const month of await readdir(yearPath)) {
      if (!/^\d{2}$/.test(month)) continue
      const monthPath = join(yearPath, month)
      if (!(await stat(monthPath)).isDirectory()) continue
      for (const day of await readdir(monthPath)) {
        if (!/^\d{2}\.md$/.test(day)) continue
        result.push(join(monthPath, day))
      }
    }
  }
  return result
}

async function main() {
  console.log('[generate-og-images] starting...')
  await mkdir(OG_DIR, { recursive: true })
  const fonts = await loadFonts()

  let written = 0
  let skipped = 0

  // 1. デフォルト
  const defaultOut = join(OG_DIR, 'default.png')
  if (!(await isUpToDate(defaultOut))) {
    const defaultPng = await renderPng(
      {
        eyebrow: 'AI-summarized AWS updates',
        title: "AWS What's New Digest",
        caption: 'Daily archive in Japanese',
      },
      fonts,
    )
    await writeFile(defaultOut, defaultPng)
    written++
  } else {
    skipped++
  }

  // 2. 日次ページ
  const dailies = await findAllDailyMarkdowns()
  for (const file of dailies) {
    const m = file.match(/(\d{4})\/(\d{2})\/(\d{2})\.md$/)
    if (!m) continue
    const date = `${m[1]}-${m[2]}-${m[3]}`
    const out = join(OG_DIR, `daily-${date}.png`)
    if (await isUpToDate(out, file)) {
      skipped++
      continue
    }
    const content = await readMarkdownFile(file)
    const entries = content ? extractEntriesFromMarkdown(content) : []
    const png = await renderPng(
      {
        eyebrow: `${date} (JST)`,
        title: entries.length === 0 ? 'No updates' : `${entries.length} updates`,
        caption: 'aws.amazon.com/new/',
      },
      fonts,
    )
    await writeFile(out, png)
    written++
  }

  // 3. サービスページ（manifest.json から読む）
  const manifestPath = join('docs/services', 'manifest.json')
  try {
    const raw = await readFile(manifestPath, 'utf-8')
    const manifest = JSON.parse(raw) as Array<{ slug: string; display: string; count: number }>
    for (const m of manifest) {
      const out = join(OG_DIR, `service-${m.slug}.png`)
      // サービスページは count が変わると再生成したいのでmanifest基準で常に再生成
      // （manifestは generate-service-pages 実行のたびに更新されるため、その mtime と比較）
      if (await isUpToDate(out, manifestPath)) {
        skipped++
        continue
      }
      const png = await renderPng(
        {
          eyebrow: 'AWS Service',
          title: m.display,
          caption: `${m.count} updates archived`,
        },
        fonts,
      )
      await writeFile(out, png)
      written++
    }
  } catch (e) {
    console.warn('[generate-og-images] manifest.json not found, skipping service images', e)
  }

  console.log(`[generate-og-images] written: ${written}, skipped (cached): ${skipped}`)

  console.log('[generate-og-images] done.')
}

main().catch((err) => {
  console.error('[generate-og-images] failed:', err)
  process.exit(1)
})
