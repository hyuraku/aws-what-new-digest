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
  },
} satisfies Theme
