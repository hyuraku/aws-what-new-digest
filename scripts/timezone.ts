import { TZDate } from '@date-fns/tz'

export const JST = 'Asia/Tokyo'

/**
 * Date を JST の TZDate に変換
 * @param date - 変換する日付
 * @returns JST タイムゾーンの TZDate
 */
export function toJST(date: Date): TZDate {
  return new TZDate(date.getTime(), JST)
}
