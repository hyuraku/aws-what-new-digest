import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { withPwa } from '@vite-pwa/vitepress'
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

export default withPwa(
  defineConfig({
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
      // --- PWA / iOS 追加分（base 込みの絶対パス） ---
      ['link', { rel: 'apple-touch-icon', href: `${BASE_PATH}apple-touch-icon-180x180.png` }],
      ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
      ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }],
      ['meta', { name: 'apple-mobile-web-app-title', content: 'AWS Digest' }],
      ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
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

      socialLinks: [
        { icon: 'github', link: 'https://github.com/yourusername/aws-whats-new-digest' },
      ],

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

    pwa: {
      registerType: 'autoUpdate',
      // 既定の registerSW.js 自動注入を止め、SW 登録と更新チェックを
      // theme/index.ts 側で自前実行する（TWA 向けに update() を能動発火するため）。
      injectRegister: false,
      // GitHub Pages のサブパス配信に合わせて明示
      base: BASE_PATH,
      scope: BASE_PATH,
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: "AWS What's New Digest",
        short_name: 'AWS Digest',
        description: 'AI要約付きAWS最新情報アーカイブ',
        lang: 'ja',
        id: BASE_PATH,
        start_url: BASE_PATH,
        scope: BASE_PATH,
        display: 'standalone',
        theme_color: '#f59e0b',
        background_color: '#0f172a',
        icons: [
          // src は base 相対（manifest 自体が base 配下に出力されるため）
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // precache はアプリシェル（ハッシュ付き＝内容不変な assets 一式）に限定する。
        // HTML はあえて含めない：precache された HTML は「その時点のトップ／サイドバー／
        // 最新リンク」を丸ごと凍結してしまい、毎日中身が変わるコンテンツと相性が悪い。
        // HTML は下の runtimeCaching で実行時ネットワーク優先にして常に最新を取りに行く。
        globPatterns: ['**/*.{js,css,woff2,svg}'],
        // OG 画像と、記事追加のたびに肥大化するローカル検索インデックスは実行時キャッシュへ回す。
        globIgnores: ['**/og/**', '**/@localSearchIndex*.js'],
        // 静的ホスティング（GitHub Pages）では各ページの HTML が実在するため、
        // SPA フォールバックは無効化し、常に実体の HTML を取得させる。
        navigateFallback: null,
        runtimeCaching: [
          // ページ遷移（HTML ドキュメント）＝常に最新を優先。
          // オフライン時や 3 秒でネットワークが返らない時だけキャッシュにフォールバック。
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // VitePress の hashmap.json は同名のまま中身が変わる（新記事チャンク名を保持）。
          // 古い版に固定されると内部遷移で新ページを見つけられないため常に最新を優先。
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/hashmap.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'vp-hashmap',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // 検索インデックスはハッシュ付きで内容不変だがサイズが大きいため、初回利用時にキャッシュする。
          // 新しいインデックスは別URLになり、古い版は expiration により順次削除される。
          {
            urlPattern: ({ url }) => /\/@localSearchIndex[^/]*\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'vp-local-search-index',
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // OG 画像は実行時にネットワーク優先でキャッシュ（オフライン閲覧の必須要件ではない）
          {
            urlPattern: ({ url }) => url.pathname.includes('/og/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'og-images',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    },
  }),
)
