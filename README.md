# pack-sim

Simulador de pacotes de Pokémon TCG: Cloudflare Worker (Hono + D1) servindo uma PWA React com abertura em Three.js. Spec em `docs/spec.md`.

## Comandos

- `pnpm dev` — Worker + assets (`web/dist`) em http://localhost:8787
- `pnpm dev:web` — Vite com HMR em http://localhost:5173 (proxy `/api` para 8787)
- `pnpm build` — build da PWA
- `pnpm test` — vitest (projects `node` e `workers`)
- `pnpm check` — formatação, tipos e testes
- `pnpm deploy` — build + `wrangler deploy`
