import { env } from 'cloudflare:test'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from './app'
import { fixtureProvider } from '../test/seed'

const image = (type = 'image/webp', status = 200) =>
  new Response(new Uint8Array([1, 2, 3]), { status, headers: { 'content-type': type } })

describe('GET /api/img/*', () => {
  it('proxies a card image with a long cache and the upstream content type', async () => {
    const fetchImage = vi.fn(async () => image())
    const app = createApp({ provider: fixtureProvider(), fetchImage })
    const res = await app.request('/api/img/pt/sv/sv03.5/001/high.webp', {}, env)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/webp')
    expect(res.headers.get('cache-control')).toBe('public, max-age=604800, immutable')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
    expect(fetchImage).toHaveBeenCalledWith(
      'https://assets.tcgdex.net/pt/sv/sv03.5/001/high.webp',
      expect.objectContaining({ cf: expect.objectContaining({ cacheEverything: true }) }),
    )
  })

  it('accepts set logos and rejects anything outside the image paths', async () => {
    const fetchImage = vi.fn(async () => image('image/png'))
    const app = createApp({ provider: fixtureProvider(), fetchImage })
    expect((await app.request('/api/img/pt/sv/sv03.5/logo.png', {}, env)).status).toBe(200)
    for (const path of [
      '../etc/passwd',
      'pt/sv/sv03.5/001/huge.webp',
      'pt/sv/sv03.5/001/high.gif',
      'pt/sv/sv03.5/001/high.webp/x',
    ]) {
      const res = await app.request(`/api/img/${path}`, {}, env)
      expect(res.status).toBe(404)
    }
    expect(fetchImage).toHaveBeenCalledTimes(1)
  })

  it('turns an upstream miss or a non-image body into 404', async () => {
    const misses = [image('image/webp', 404), image('text/plain')]
    const fetchImage = vi.fn(async () => misses.shift()!)
    const app = createApp({ provider: fixtureProvider(), fetchImage })
    expect((await app.request('/api/img/pt/sv/sv03.5/001/high.webp', {}, env)).status).toBe(404)
    expect((await app.request('/api/img/pt/sv/sv03.5/002/high.webp', {}, env)).status).toBe(404)
  })
})
