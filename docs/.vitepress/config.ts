import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { type DefaultTheme, defineConfig } from 'vitepress'

const BASE_PATH = '/aws-what-new-digest/'

/**
 * 最新の日付ファイルのパスを取得
 * @returns 最新の日付パス（例: /2026/01/02）またはnull
 */
async function getLatestDatePath(): Promise<string | null> {
  const docsDir = join(__dirname, '..')

  try {
    // 年ディレクトリを取得（新しい順）
    const yearDirs = await readdir(docsDir)
    const years = yearDirs.filter((d) => /^\d{4}$/.test(d)).sort((a, b) => b.localeCompare(a))

    for (const year of years) {
      const yearPath = join(docsDir, year)
      const yearStat = await stat(yearPath)
      if (!yearStat.isDirectory()) continue

      // 月ディレクトリを取得（新しい順）
      const monthDirs = await readdir(yearPath)
      const months = monthDirs.filter((d) => /^\d{2}$/.test(d)).sort((a, b) => b.localeCompare(a))

      for (const month of months) {
        const monthPath = join(yearPath, month)
        const monthStat = await stat(monthPath)
        if (!monthStat.isDirectory()) continue

        // 日ファイルを取得（新しい順）
        const dayFiles = await readdir(monthPath)
        const days = dayFiles
          .filter((f) => /^\d{2}\.md$/.test(f))
          .sort((a, b) => b.localeCompare(a))

        if (days.length > 0) {
          const latestDay = days[0].replace('.md', '')
          return `/${year}/${month}/${latestDay}`
        }
      }
    }
  } catch {
    // エラー時はnull
  }

  return null
}

/**
 * docs/services/manifest.json からサービス別サイドバーを生成
 */
async function generateServicesSidebar(): Promise<DefaultTheme.SidebarItem[]> {
  const manifestPath = join(__dirname, '..', 'services', 'manifest.json')
  try {
    const raw = await readFile(manifestPath, 'utf-8')
    const manifest = JSON.parse(raw) as Array<{ slug: string; display: string; count: number }>
    const items: DefaultTheme.SidebarItem[] = manifest.map((m) => ({
      text: `${m.display} (${m.count})`,
      link: `/services/${m.slug}`,
    }))
    return [
      {
        text: 'サービス一覧',
        items: [{ text: 'すべて', link: '/services/' }, ...items],
      },
    ]
  } catch {
    return []
  }
}

/**
 * 年/月/日の階層ナビゲーションを自動生成
 */
async function generateSidebar(): Promise<DefaultTheme.SidebarItem[]> {
  const docsDir = join(__dirname, '..')
  const sidebar: DefaultTheme.SidebarItem[] = []

  try {
    // 年ディレクトリを取得
    const yearDirs = await readdir(docsDir)
    const years = yearDirs.filter((d) => /^\d{4}$/.test(d)).sort((a, b) => b.localeCompare(a)) // 新しい順

    for (const year of years) {
      const yearPath = join(docsDir, year)
      const yearStat = await stat(yearPath)
      if (!yearStat.isDirectory()) continue

      const yearItem: DefaultTheme.SidebarItem = {
        text: `${year}年`,
        collapsed: true,
        items: [],
      }

      // 月ディレクトリを取得
      const monthDirs = await readdir(yearPath)
      const months = monthDirs.filter((d) => /^\d{2}$/.test(d)).sort((a, b) => b.localeCompare(a)) // 新しい順

      for (const month of months) {
        const monthPath = join(yearPath, month)
        const monthStat = await stat(monthPath)
        if (!monthStat.isDirectory()) continue

        const monthItem: DefaultTheme.SidebarItem = {
          text: `${Number.parseInt(month, 10)}月`,
          collapsed: true,
          items: [],
        }

        // 日ファイルを取得
        const dayFiles = await readdir(monthPath)
        const days = dayFiles
          .filter((f) => /^\d{2}\.md$/.test(f))
          .sort((a, b) => b.localeCompare(a)) // 新しい順

        for (const day of days) {
          const dayNum = day.replace('.md', '')
          monthItem.items!.push({
            text: `${Number.parseInt(dayNum, 10)}日`,
            link: `/${year}/${month}/${dayNum}`,
          })
        }

        if (monthItem.items!.length > 0) {
          yearItem.items!.push(monthItem)
        }
      }

      if (yearItem.items!.length > 0) {
        sidebar.push(yearItem)
      }
    }
  } catch {
    // ディレクトリが存在しない場合は空のサイドバーを返す
  }

  return sidebar
}

export default defineConfig({
  title: "AWS What's New Digest",
  description: 'AI要約付きAWS最新情報アーカイブ',
  lang: 'ja',
  base: BASE_PATH,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE_PATH}favicon.svg` }],
    ['meta', { name: 'theme-color', content: '#f59e0b' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: "AWS What's New Digest" }],
    ['meta', { property: 'og:description', content: 'AI要約付きAWS最新情報アーカイブ' }],
  ],

  themeConfig: {
    logo: '/favicon.svg',
    nav: [
      { text: 'ホーム', link: '/' },
      { text: 'サービス別', link: '/services/' },
      { text: 'AWS公式', link: 'https://aws.amazon.com/new/' },
    ],

    sidebar: {
      '/services/': await generateServicesSidebar(),
      '/': await generateSidebar(),
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/yourusername/aws-whats-new-digest' }],

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '検索',
            buttonAriaLabel: '検索',
          },
          modal: {
            noResultsText: '結果が見つかりませんでした',
            resetButtonTitle: 'リセット',
            footer: {
              selectText: '選択',
              navigateText: '移動',
              closeText: '閉じる',
            },
          },
        },
      },
    },

    footer: {
      message: 'AI要約はOpenAI GPT-5-miniによって生成されています。',
      copyright: `Copyright © ${new Date().getFullYear()}`,
    },

    outline: {
      label: '目次',
    },

    docFooter: {
      prev: '前のページ',
      next: '次のページ',
    },

    lastUpdated: {
      text: '最終更新',
    },
  },

  // index.mdのheroリンクを最新日付に動的に書き換え
  async transformPageData(pageData) {
    if (pageData.relativePath === 'index.md' && pageData.frontmatter.hero?.actions) {
      const latestPath = await getLatestDatePath()
      if (latestPath) {
        for (const action of pageData.frontmatter.hero.actions) {
          if (action.text === '最新の更新を見る') {
            action.link = latestPath
          }
        }
      }
    }
  },
})
