import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import graphqlLoader from 'vite-plugin-graphql-loader'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), graphqlLoader()],
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'html', 'json-summary'],
      // Count every source file, not just the ones a test happens to touch, so a
      // brand-new untested file reads as 0% and trips the floor (the whole point).
      all: true,
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/graphql/generated/**', // codegen output
        'src/**/*.d.ts',
        'src/main.ts',
        'src/router/**',
        'src/types/**', // type-only
        'src/utils/apolloClient.ts', // thin infra wiring, not unit-testable
        'src/utils/cableConsumer.ts',
        'src/utils/env.ts',
        'src/solver/worker.ts', // Web Worker entry — runs off-main-thread, not unit-testable
      ],
      // Tiered coverage floor. Like the API's SimpleCov `minimum_coverage 90`,
      // these fail `npm run test:coverage` (CI + bin/check) when coverage drops.
      // Numbers sit a few points below the measured baseline so routine refactors
      // pass but a real regression (deleted tests, new untested code) fails. The
      // logic tiers we already trust carry a high floor; the grid components —
      // the class that caused a prod outage — and the stores carry a real floor
      // that can only be raised over time (a deliberate bump, like the API's 90).
      thresholds: {
        // Global floor across every included file (views/components are mostly
        // untested, which is why this is lower than the per-tier floors).
        statements: 37,
        branches: 22,
        functions: 25,
        lines: 38,
        // Already-good logic — protected at a high floor.
        'src/utils/**': { statements: 79, branches: 73, functions: 79, lines: 82 },
        'src/solver/engine/**': { statements: 76, branches: 64, functions: 85, lines: 79 },
        'src/composables/**': { statements: 55, branches: 50, functions: 52, lines: 56 },
        // Weaker logic + the outage-prone grid — real floors, ratchet up later.
        'src/stores/**': { statements: 28, branches: 18, functions: 21, lines: 30 },
        'src/components/grid/**': { statements: 31, branches: 11, functions: 32, lines: 33 },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
