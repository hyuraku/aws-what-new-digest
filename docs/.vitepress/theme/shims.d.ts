// vite-plugin-pwa 同梱の仮想モジュール型（virtual:pwa-register 等）を取り込む。
// onRegisteredSW の registration も公式型で ServiceWorkerRegistration に解決される。
/// <reference types="vite-plugin-pwa/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*.css'
