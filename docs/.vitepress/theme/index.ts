/// <reference lib="dom" />
// Custom VitePress theme extending the default theme
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import ArticleCard from './ArticleCard.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Register global components
    app.component('ArticleCard', ArticleCard)

    // SW の登録と「能動的な更新チェック」はブラウザでのみ実行する。
    // （enhanceApp は SSR ビルドでも呼ばれるためガードする）
    if (typeof window !== 'undefined') {
      void registerServiceWorker()
    }
  },
} satisfies Theme

/**
 * Service Worker を自前登録し、更新監視を仕掛ける。
 *
 * registerType: 'autoUpdate' なので、新しい SW が「見つかれば」
 * skipWaiting → controllerchange → リロードまで vite-plugin-pwa が面倒を見る。
 * こちら側の責務は「新しい SW を能動的に探しに行く（update() を叩く）」こと。
 */
async function registerServiceWorker(): Promise<void> {
  // virtual:pwa-register はクライアント専用の仮想モジュール。
  // SSR バンドルに混ざらないよう動的 import する。
  const { registerSW } = await import('virtual:pwa-register')
  registerSW({
    immediate: true,
    onRegisteredSW(_swScriptUrl, registration) {
      if (!registration) return
      scheduleUpdateChecks(registration)
    },
  })
}

/**
 * 新デプロイを拾うため registration.update() を能動的に叩くタイミングを仕込む。
 * TWA にはリロード UI が無く、古い SW に固定されると自力で復帰できないため必要。
 * 見つかった後の skipWaiting→リロードは autoUpdate 側が担うので、ここでは扱わない。
 */
function scheduleUpdateChecks(registration: ServiceWorkerRegistration): void {
  // 1) フォアグラウンド復帰時に更新チェック（TWA では「開き直す ≒ visible 遷移」で最重要）。
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void registration.update()
    }
  })

  // 2) 開きっぱなし運用でも取り残されないよう 60 分間隔でも更新チェック。
  //    hidden 中の発火は無駄なので visible のときだけ叩く（復帰時は 1) がカバー）。
  const UPDATE_INTERVAL_MS = 60 * 60 * 1000
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      void registration.update()
    }
  }, UPDATE_INTERVAL_MS)
}
