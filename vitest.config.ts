import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    passWithNoTests: true,
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
