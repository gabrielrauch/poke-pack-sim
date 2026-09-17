import { Hono } from 'hono'
import { ownedInSet } from '../db/owned'
import { requireUser } from './auth'
import { SET_ID, type AppEnv } from './env'

export function collectionRoutes() {
  const app = new Hono<AppEnv>()

  app.get('/api/collection/:set', requireUser, async (c) => {
    const setId = c.req.param('set')
    if (!SET_ID.test(setId)) return c.json({ error: 'NOT_FOUND' }, 404)
    const rows = await ownedInSet(c.env.DB, c.get('user').id, setId)
    const counts: Record<string, { normal: number; reverse: number; first: string }> = {}
    for (const row of rows)
      counts[row.card_n] = {
        normal: row.count_normal,
        reverse: row.count_reverse,
        first: row.first_pulled_at,
      }
    c.header('Cache-Control', 'private, no-store')
    return c.json(counts)
  })

  return app
}
