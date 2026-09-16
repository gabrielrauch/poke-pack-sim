import { Hono } from 'hono'
import { PackError } from '../pack'
import { ProviderError } from '../provider/errors'
import { collectionRoutes } from './collection'
import { SET_ID, type AppDeps, type AppEnv } from './env'
import { manifestRoutes } from './manifest'
import { meRoutes } from './me'
import { packRoutes } from './packs'

export type { AppDeps, AppEnv } from './env'

export function createApp(deps: AppDeps) {
  const { provider } = deps
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

  app.route('/', meRoutes(deps))
  app.route('/', packRoutes(deps))
  app.route('/', collectionRoutes())
  app.route('/', manifestRoutes())

  app.notFound((c) => c.json({ error: 'NOT_FOUND' }, 404))

  app.onError((err, c) => {
    console.error(err)
    if (err instanceof ProviderError) return c.json({ error: 'PROVIDER_UNAVAILABLE' }, 503)
    if (err instanceof PackError) return c.json({ error: 'INTERNAL' }, 500)
    return c.json({ error: 'INTERNAL' }, 500)
  })

  return app
}
