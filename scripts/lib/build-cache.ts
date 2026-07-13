import { stat } from 'node:fs/promises'

/**
 * 出力ファイルがソースより新しいなら true（再生成スキップ可）
 *
 * generate-og-images / generate-pwa-icons で重複実装されていた mtime 比較の統合先。
 *
 * @param outPath - 出力ファイルのパス
 * @param srcPath - ソースファイルのパス。省略時は出力の存在チェックのみ
 */
export async function isUpToDate(outPath: string, srcPath?: string): Promise<boolean> {
  try {
    const outStat = await stat(outPath)
    if (!srcPath) return true
    const srcStat = await stat(srcPath)
    return outStat.mtimeMs >= srcStat.mtimeMs
  } catch {
    return false
  }
}
