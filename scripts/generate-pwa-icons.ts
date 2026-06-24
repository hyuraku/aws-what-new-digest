/**
 * PWAアイコンの生成
 *
 * docs/public/favicon.svg を入力に、PWA用の PNG アイコンを docs/public/ に出力する。
 * @resvg/resvg-js で SVG をラスタライズする（satori は不要 = 既に SVG があるため）。
 *
 * 出力ファイル:
 *   docs/public/pwa-192x192.png            (透過, Android ホーム画面 / manifest)
 *   docs/public/pwa-512x512.png            (透過, manifest / スプラッシュ)
 *   docs/public/pwa-maskable-512x512.png   (背景塗り, maskable purpose)
 *   docs/public/apple-touch-icon-180x180.png (背景塗り, iOS は透過を黒化するため)
 *
 * これらは VitePress ビルド時に static asset としてコピーされ、
 * config.ts の pwa.manifest / head から参照される。
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SRC = join(__dirname, '..', 'docs/public/favicon.svg')
const OUT_DIR = join(__dirname, '..', 'docs/public')
const BG = '#0f172a' // background_color と一致（透過を埋める）

interface IconSpec {
  name: string
  size: number
  /** 指定時は背景を塗りつぶす（maskable / apple 用）。未指定なら透過を維持。 */
  background?: string
}

const ICONS: IconSpec[] = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'pwa-maskable-512x512.png', size: 512, background: BG },
  { name: 'apple-touch-icon-180x180.png', size: 180, background: BG },
]

/**
 * 出力PNGがソース（favicon.svg）より新しいなら true（再生成スキップ可）
 */
async function isUpToDate(outPath: string, srcPath: string): Promise<boolean> {
  try {
    const [out, src] = await Promise.all([stat(outPath), stat(srcPath)])
    return out.mtimeMs >= src.mtimeMs
  } catch {
    return false
  }
}

async function main() {
  console.log('[generate-pwa-icons] starting...')
  await mkdir(OUT_DIR, { recursive: true })
  const svg = await readFile(SRC)

  let written = 0
  let skipped = 0

  for (const icon of ICONS) {
    const out = join(OUT_DIR, icon.name)
    if (await isUpToDate(out, SRC)) {
      skipped++
      continue
    }
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: icon.size },
      background: icon.background, // undefined なら透過維持
    })
    const png = resvg.render().asPng()
    await writeFile(out, png)
    written++
  }

  console.log(`[generate-pwa-icons] written: ${written}, skipped (cached): ${skipped}`)
  console.log('[generate-pwa-icons] done.')
}

main().catch((err) => {
  console.error('[generate-pwa-icons] failed:', err)
  process.exit(1)
})
