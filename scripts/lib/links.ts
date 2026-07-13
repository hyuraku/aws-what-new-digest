/**
 * 重複判定用にリンクを正規化する
 *
 * duplicate-checker（RSS取得時の重複除外）と collect（既存ファイルへの追記時の再除外）が
 * 同じ基準で比較するための単一の正規化関数。基準を変える場合はここだけを変更する。
 */
export function normalizeLink(link: string): string {
  return link.toLowerCase()
}
