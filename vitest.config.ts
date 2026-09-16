import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig(async () => {
  const migrations = await readD1Migrations('src/db/migrations')
  return {
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
          plugins: [
            cloudflareTest({
              wrangler: { configPath: './wrangler.jsonc' },
              miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
            }),
          ],
          test: {
            name: 'workers',
            include: ['src/api/**/*.test.ts', 'src/db/**/*.test.ts', 'src/worker.test.ts'],
            setupFiles: ['src/test/apply-migrations.ts'],
          },
        },
      ],
    },
  }
})
