import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // カバレッジは純粋ロジック（ユニットテスト可能な部分）のみを対象にする。
      // エントリポイント（collect.ts）と生成スクリプト（generate-*.ts）は
      // IOオーケストレータであり、collect.yml の品質ゲートと docs:build が
      // 実行そのものを毎日検証しているため対象外とする。
      include: ['scripts/**/*.ts'],
      exclude: [
        'scripts/types.ts',
        'scripts/collect.ts',
        'scripts/generate-og-images.ts',
        'scripts/generate-pwa-icons.ts',
        'scripts/generate-service-pages.ts',
        'tests/**/*',
      ],
      // 閾値は「後退防止ライン」: 実測値（2026-07 時点で lines 66% / branches 60% /
      // functions 62%）の少し下に置き、CI（ci.yml）で計測して守らせる。
      // テストを増やして実測が上がったら、この閾値も引き上げること。
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 55,
        statements: 60,
      },
    },
  },
})
