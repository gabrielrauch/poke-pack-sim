# pack-sim

Simulador de pacotes de Pokémon TCG: Cloudflare Worker (Hono + D1) servindo uma PWA React com abertura em Three.js. Spec em `docs/spec.md`.

## Comandos

- `pnpm dev` — Worker + assets (`web/dist`) em http://localhost:8787
- `pnpm dev:web` — Vite com HMR em http://localhost:5173 (proxy `/api` para 8787)
- `pnpm build` — build da PWA
- `pnpm test` — vitest (projects `node` e `workers`)
- `pnpm test:coverage` — cobertura de `src/pack` (exige 100%)
- `pnpm check` — formatação, tipos e testes
- `pnpm deploy` — build + `wrangler deploy`
- `pnpm db:migrate` — aplica as migrações no D1 local (`db:migrate:remote` para produção)
- `pnpm user:create "Nome"` — cria a usuária e imprime o link com o token (`--remote` para produção)

## API

Todas as rotas em `/api/*` (menos `health` e `catalog`) exigem `Authorization: Bearer <token>`.

- `GET /api/me` — perfil, `packs_available`, `next_refill_at`
- `POST /api/packs` `{set_id, pack_id}` — abre um pacote; idempotente por `pack_id`
- `GET /api/packs?limit=30&before=<opened_at>` — histórico, mais recentes primeiro
- `GET /api/collection/:set` — `{ "001": { "normal": 1, "reverse": 0 } }`
- `GET /api/catalog/:set` — catálogo do set (provider TCGdex, cache 1 h)
- `GET /manifest.webmanifest?t=<token>` — manifest com `start_url` carregando o token (iOS)
- `GET /api/img/<caminho no CDN>` — passthrough das imagens do TCGdex (`pt/sv/sv03.5/001/high.webp`, `.../logo.png`), cache de 7 dias; o CDN manda CORS duplicado e o navegador rejeita carregar direto

## Protótipo 3D (`/lab`)

`pnpm dev` (Worker, para as imagens) e `pnpm dev:web`, depois http://localhost:5173/lab. Dados falsos com imagens reais do sv03.5; `?tier=hyper_rare` escolhe a última carta (`rare`, `holo`, `double_rare`, `illustration_rare`, `ultra_rare`, `special_illustration_rare`, `hyper_rare`). O medidor no topo mostra fps, ms por frame, draw calls, triângulos e pixel ratio. Espaço/Enter rasga o pacote e vira cartas no desktop; em dev a cena fica em `window.__scene`.

No iPhone (mesma rede): `pnpm build && pnpm exec wrangler dev --ip 0.0.0.0 --port 8787 --local-protocol https` e abra `https://<ip-da-mac>:8787/lab` (HTTPS é necessário para `deviceorientation`).

## Tela de abertura (`/abrir`)

1. `pnpm db:migrate` e `pnpm user:create "Nome"` (imprime o link com o token).
2. `pnpm dev` (Worker) e `pnpm dev:web` (Vite com HMR), depois abra o link local trocando a porta: `http://localhost:5173/#t=<token>`. O token vai para o `localStorage` e sai da URL; sem token, `/abrir` mostra "Link de acesso inválido".
3. "Abrir pacote": o pacote fechado entra enquanto o `POST /api/packs` roda; rasgue pelo topo e vire as cartas. Sem cota, a tela diz a hora da recarga.

- `pack_id` é gerado na tela e reutilizado em "Tentar de novo": a API é idempotente por id.
- `prefers-reduced-motion`: metade das durações, sem lascas/partículas/raios, flip vira fade, pacote parado (DevTools → Rendering para emular).
- Sem WebGL2 o caminho é DOM (uma carta por toque). Em dev, `/abrir?fallback=1` força esse caminho.
- Só um `wrangler dev` por vez no mesmo D1 local (`SQLITE_BUSY`).
