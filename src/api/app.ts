import { Hono } from 'hono'

export type AppEnv = { Bindings: Env }

export function createApp() {
  const app = new Hono<AppEnv>()

  app.get('/api/health', async (c) => {
    const row = await c.env.DB.prepare('SELECT 1 AS one').first<{ one: number }>()
    return c.json({ ok: true, db: row?.one === 1 })
  })

  app.notFound((c) => c.json({ error: 'NOT_FOUND' }, 404))

  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'INTERNAL' }, 500)
  })

  return app
}
