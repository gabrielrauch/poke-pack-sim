import { Hono } from 'hono'
import { ProviderError } from '../provider/errors'
import type { CardProvider } from '../provider/types'

export type AppEnv = { Bindings: Env }
export type AppDeps = { provider: CardProvider }

/** Ids do TCGdex: `sv03.5`, `swsh12`, `me01`. Evita mandar lixo para o filtro por prefixo do GraphQL. */
const SET_ID = /^[a-z0-9]{1,12}(?:\.[0-9]{1,3})?$/

export function createApp({ provider }: AppDeps) {
  const app = new Hono<AppEnv>()

  app.get('/api/health', async (c) => {
    const row = await c.env.DB.prepare('SELECT 1 AS one').first<{ one: number }>()
    return c.json({ ok: true, db: row?.one === 1 })
  })

  app.get('/api/catalog/:set', async (c) => {
    const setId = c.req.param('set')
    if (!SET_ID.test(setId)) return c.json({ error: 'NOT_FOUND' }, 404)
    const catalog = await provider.getSet(setId, 'pt')
    if (!catalog) return c.json({ error: 'NOT_FOUND' }, 404)
    c.header('Cache-Control', 'public, max-age=3600')
    return c.json(catalog)
  })

  app.notFound((c) => c.json({ error: 'NOT_FOUND' }, 404))

  app.onError((err, c) => {
    console.error(err)
    if (err instanceof ProviderError) return c.json({ error: 'PROVIDER_UNAVAILABLE' }, 503)
    return c.json({ error: 'INTERNAL' }, 500)
  })

  return app
}
