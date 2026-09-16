/// <reference types="@cloudflare/vitest-plugin/types" />
import type { D1Migration } from 'cloudflare:test'

declare global {
  namespace Cloudflare {
    interface Env {
      /** Só no vitest: migrações lidas em vitest.config.ts e aplicadas em src/test/apply-migrations.ts. */
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}
