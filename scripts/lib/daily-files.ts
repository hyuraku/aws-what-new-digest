import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * docs配下を走査し、すべての日次Markdown（docs/YYYY/MM/DD.md）のパスを返す
 *
 * generate-service-pages / generate-og-images で重複実装されていた走査ロジックの統合先。
 * なお docs/.vitepress/config.ts（getLatestDatePath / generateSidebar）にも同種の走査が
 * あるが、あちらはディレクトリ階層構造そのものを必要とするため共有していない。
 *
 * @param docsDir - docsディレクトリのパス（デフォルト: 'docs'）
 * @returns 日次Markdownのパス一覧（順序は readdir 依存）
 */
export async function findAllDailyMarkdowns(docsDir = 'docs'): Promise<string[]> {
  const result: string[] = []
  const yearDirs = await readdir(docsDir)
  for (const year of yearDirs) {
    if (!/^\d{4}$/.test(year)) continue
    const yearPath = join(docsDir, year)
    if (!(await stat(yearPath)).isDirectory()) continue

    const monthDirs = await readdir(yearPath)
    for (const month of monthDirs) {
      if (!/^\d{2}$/.test(month)) continue
      const monthPath = join(yearPath, month)
      if (!(await stat(monthPath)).isDirectory()) continue

      const dayFiles = await readdir(monthPath)
      for (const day of dayFiles) {
        if (!/^\d{2}\.md$/.test(day)) continue
        result.push(join(monthPath, day))
      }
    }
  }
  return result
}
