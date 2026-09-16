import { Hono } from 'hono'
import { favoritesOf, persistRefill } from '../db/users'
import { ALLOWANCE } from './allowance'
import { requireUser } from './auth'
import type { AppDeps, AppEnv } from './env'
import { localDate, nextLocalMidnight } from './time'

export function meRoutes({ now = () => new Date() }: AppDeps) {
  const app = new Hono<AppEnv>()

  app.get('/api/me', requireUser, async (c) => {
    const at = now()
    const tz = c.env.TIMEZONE
    const user = await persistRefill(c.env.DB, c.get('user'), localDate(at, tz), ALLOWANCE)
    c.header('Cache-Control', 'private, no-store')
    return c.json({
      id: user.id,
      name: user.name,
      packs_available: user.packs_available,
      next_refill_at: nextLocalMidnight(at, tz).toISOString(),
      total_packs: user.total_packs,
      packs_since_hit: user.packs_since_hit,
      favorites: favoritesOf(user),
    })
  })

  return app
}
