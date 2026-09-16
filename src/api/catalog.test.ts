import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { ProviderError } from '../provider/errors'
import type { CardProvider, SetCatalog } from '../provider/types'
import { createApp } from './app'

const catalog: SetCatalog = {
  id: 'sv03.5',
  name: '151',
  lang: 'pt',
  total: 1,
  logo: null,
  symbol: null,
  cards: [{ n: '001', name: 'Bulbasaur', tier: 'common', reverse: true, img: null }],
}

function appWith(getSet: CardProvider['getSet']) {
  return createApp({ provider: { getSet } })
}

describe('GET /api/catalog/:set', () => {
  it('returns the pt catalog with a one hour public cache', async () => {
    const seen: string[] = []
    const app = appWith(async (setId, lang) => {
      seen.push(`${setId}:${lang}`)
      return catalog
    })
    const res = await app.request('/api/catalog/sv03.5', undefined, env)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600')
    expect(await res.json()).toEqual(catalog)
    expect(seen).toEqual(['sv03.5:pt'])
  })

  it('returns 404 for a set the provider does not know', async () => {
    const res = await appWith(async () => null).request('/api/catalog/zzz', undefined, env)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'NOT_FOUND' })
  })

  it('returns 404 for malformed ids without asking the provider', async () => {
    let called = false
    const app = appWith(async () => {
      called = true
      return catalog
    })
    const res = await app.request('/api/catalog/sv03.5%3Bdrop', undefined, env)
    expect(res.status).toBe(404)
    expect(called).toBe(false)
  })

  it('returns 503 PROVIDER_UNAVAILABLE when the provider fails', async () => {
    const app = appWith(async () => {
      throw new ProviderError('UPSTREAM', 'down')
    })
    const res = await app.request('/api/catalog/sv03.5', undefined, env)
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'PROVIDER_UNAVAILABLE' })
  })

  it('returns 500 INTERNAL for unexpected errors', async () => {
    const app = appWith(async () => {
      throw new Error('boom')
    })
    const res = await app.request('/api/catalog/sv03.5', undefined, env)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'INTERNAL' })
  })
})
