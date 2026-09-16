import { Hono } from 'hono'
import { TOKEN, userForToken } from './auth'
import type { AppEnv } from './env'

/** Espelha o manifest do web/vite.config.ts; só `start_url` muda, porque o iOS abre o app instalado sem o fragmento. */
const BASE = {
  id: '/',
  name: 'pack-sim',
  short_name: 'pack-sim',
  display: 'standalone',
  background_color: '#15123a',
  theme_color: '#15123a',
  lang: 'pt-BR',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}

export function manifestRoutes() {
  const app = new Hono<AppEnv>()

  app.get('/manifest.webmanifest', async (c) => {
    const token = c.req.query('t')
    if (token === undefined) return c.env.ASSETS.fetch(c.req.raw)
    const user = TOKEN.test(token) ? await userForToken(c.env.DB, token) : null
    if (!user) return c.json({ error: 'UNAUTHORIZED' }, 401)
    return c.body(JSON.stringify({ ...BASE, start_url: `/?t=${token}` }), 200, {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'private, no-store',
    })
  })

  return app
}
