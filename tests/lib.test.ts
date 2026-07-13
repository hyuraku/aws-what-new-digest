import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isUpToDate } from '../scripts/lib/build-cache.js'
import { findAllDailyMarkdowns } from '../scripts/lib/daily-files.js'
import { normalizeLink } from '../scripts/lib/links.js'

let tmpRoot: string

beforeEach(async () => {
  tmpRoot = await mkdtemp(join(tmpdir(), 'awsdigest-lib-test-'))
})

afterEach(async () => {
  await rm(tmpRoot, { recursive: true, force: true })
})

describe('findAllDailyMarkdowns', () => {
  it('YYYY/MM/DD.md 構造のファイルだけを列挙する', async () => {
    await mkdir(join(tmpRoot, '2026', '01'), { recursive: true })
    await mkdir(join(tmpRoot, '2026', '02'), { recursive: true })
    await writeFile(join(tmpRoot, '2026', '01', '15.md'), '# a')
    await writeFile(join(tmpRoot, '2026', '02', '01.md'), '# b')
    // 対象外: 日次パターンに合わないもの
    await writeFile(join(tmpRoot, 'index.md'), '# top')
    await writeFile(join(tmpRoot, '2026', '01', 'notes.md'), '# c')
    await mkdir(join(tmpRoot, 'services'), { recursive: true })
    await writeFile(join(tmpRoot, 'services', 'ec2.md'), '# d')

    const files = await findAllDailyMarkdowns(tmpRoot)

    expect(files.sort()).toEqual([
      join(tmpRoot, '2026', '01', '15.md'),
      join(tmpRoot, '2026', '02', '01.md'),
    ])
  })

  it('該当ファイルがなければ空配列を返す', async () => {
    expect(await findAllDailyMarkdowns(tmpRoot)).toEqual([])
  })
})

describe('isUpToDate', () => {
  it('出力がソースより新しければ true', async () => {
    const src = join(tmpRoot, 'src.txt')
    const out = join(tmpRoot, 'out.png')
    await writeFile(src, 'src')
    await writeFile(out, 'out')
    // out を src より確実に新しくする
    const now = Date.now() / 1000
    await utimes(src, now - 100, now - 100)
    await utimes(out, now, now)

    expect(await isUpToDate(out, src)).toBe(true)
  })

  it('出力がソースより古ければ false', async () => {
    const src = join(tmpRoot, 'src.txt')
    const out = join(tmpRoot, 'out.png')
    await writeFile(src, 'src')
    await writeFile(out, 'out')
    const now = Date.now() / 1000
    await utimes(out, now - 100, now - 100)
    await utimes(src, now, now)

    expect(await isUpToDate(out, src)).toBe(false)
  })

  it('出力が存在しなければ false', async () => {
    const src = join(tmpRoot, 'src.txt')
    await writeFile(src, 'src')

    expect(await isUpToDate(join(tmpRoot, 'missing.png'), src)).toBe(false)
  })

  it('ソース省略時は出力の存在チェックのみ', async () => {
    const out = join(tmpRoot, 'out.png')
    await writeFile(out, 'out')

    expect(await isUpToDate(out)).toBe(true)
    expect(await isUpToDate(join(tmpRoot, 'missing.png'))).toBe(false)
  })
})

describe('normalizeLink', () => {
  it('小文字化して比較キーを揃える', () => {
    expect(normalizeLink('https://AWS.Amazon.com/About-AWS/Whats-New/')).toBe(
      'https://aws.amazon.com/about-aws/whats-new/',
    )
  })

  it('正規化後の同一視: 大文字小文字違いのリンクが一致する', () => {
    const a = 'https://aws.amazon.com/new/Feature-X/'
    const b = 'https://aws.amazon.com/new/feature-x/'
    expect(normalizeLink(a)).toBe(normalizeLink(b))
  })
})
