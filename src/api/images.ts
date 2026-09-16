import { Hono } from 'hono'
import type { AppDeps, AppEnv } from './env'

export const IMAGE_ORIGIN = 'https://assets.tcgdex.net'
/** `pt/sv/sv03.5/001/high.webp`, `pt/sv/sv03.5/logo.png`, `univ/sv/sv03.5/symbol.png`. */
const IMAGE_PATH =
  /^[a-z]{2,4}\/[a-z0-9]+\/[a-z0-9.]+\/(?:[A-Za-z0-9-]+\/(?:low|high)|logo|symbol)\.(?:webp|png)$/
const IMAGE_TTL = 60 * 60 * 24 * 7

/**
 * Passthrough das imagens do TCGdex: o CDN deles manda `access-control-allow-origin` duplicado em parte
 * das respostas e o navegador rejeita o CORS, o que quebra `<img crossorigin>` e texturas WebGL.
 * Mesma origem resolve; a resposta fica no cache da borda por 7 dias.
 */
export function imageRoutes({ fetchImage = fetch }: Pick<AppDeps, 'fetchImage'>) {
  const app = new Hono<AppEnv>()

  app.get('/api/img/*', async (c) => {
    const path = c.req.path.slice('/api/img/'.length)
    if (!IMAGE_PATH.test(path)) return c.json({ error: 'NOT_FOUND' }, 404)
    const upstream = await fetchImage(`${IMAGE_ORIGIN}/${path}`, {
      cf: { cacheEverything: true, cacheTtl: IMAGE_TTL },
    })
    if (!upstream.ok) return c.json({ error: 'NOT_FOUND' }, 404)
    const type = upstream.headers.get('content-type') ?? ''
    if (!type.startsWith('image/')) return c.json({ error: 'NOT_FOUND' }, 404)
    return new Response(upstream.body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': `public, max-age=${IMAGE_TTL}, immutable`,
      },
    })
  })

  return app
}
