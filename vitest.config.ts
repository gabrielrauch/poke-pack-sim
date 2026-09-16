import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/pack/**/*.ts'],
      exclude: ['src/pack/**/*.test.ts'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
    projects: [
      {
        test: {
          name: 'node',
          include: [
            'src/pack/**/*.test.ts',
            'src/provider/**/*.test.ts',
            'web/src/**/*.test.{ts,tsx}',
          ],
          environment: 'node',
        },
      },
      {
        plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
        test: { name: 'workers', include: ['src/api/**/*.test.ts', 'src/worker.test.ts'] },
      },
    ],
  },
})
