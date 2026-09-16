import { describe, expect, it } from 'vitest'
import { CachedProvider, DEFAULT_TTL_MS, type CacheLike } from './cached'
import { ProviderError } from './errors'
import type { CardProvider, SetCatalog } from './types'

const catalog: SetCatalog = {
  id: 'sv03.5',
  name: '151',
  lang: 'pt',
  total: 1,
  logo: null,
  symbol: null,
  cards: [{ n: '001', name: 'Bulbasaur', tier: 'common', reverse: true, img: null }],
}

const keyOf = (req: RequestInfo | URL) =>
  typeof req === 'string' ? req : req instanceof URL ? req.href : req.url

function fakeCache() {
  const store = new Map<string, Response>()
  const cache: CacheLike = {
    match: async (req) => store.get(keyOf(req))?.clone(),
    put: async (req, res) => {
      store.set(keyOf(req), res)
    },
  }
  return { cache, store }
}

function fakeInner(results: Array<SetCatalog | null | Error>) {
  let calls = 0
  const inner: CardProvider = {
    getSet: async () => {
      const next = results[Math.min(calls, results.length - 1)]
      calls++
      if (next instanceof Error) throw next
      return next ?? null
    },
  }
  return { inner, calls: () => calls }
}

function setup(results: Array<SetCatalog | null | Error>, cache?: CacheLike) {
  const clock = { now: 1_000 }
  const { inner, calls } = fakeInner(results)
  const provider = new CachedProvider(inner, {
    openCache: async () => cache,
    now: () => clock.now,
  })
  return { provider, calls, clock }
}

describe('CachedProvider', () => {
  it('serves the second call from memory', async () => {
    const { provider, calls } = setup([catalog])
    expect(await provider.getSet('sv03.5', 'pt')).toEqual(catalog)
    expect(await provider.getSet('sv03.5', 'pt')).toEqual(catalog)
    expect(calls()).toBe(1)
  })

  it('keys by language and set', async () => {
    const { provider, calls } = setup([catalog])
    await provider.getSet('sv03.5', 'pt')
    await provider.getSet('sv03.5', 'en')
    await provider.getSet('sv04', 'pt')
    expect(calls()).toBe(3)
  })

  it('writes to the Cache API and another instance reads it', async () => {
    const { cache, store } = fakeCache()
    const first = setup([catalog], cache)
    await first.provider.getSet('sv03.5', 'pt')
    expect([...store.keys()]).toEqual(['https://provider.pack-sim.internal/provider/pt/sv03.5'])

    const second = setup([new Error('should not be called')], cache)
    expect(await second.provider.getSet('sv03.5', 'pt')).toEqual(catalog)
    expect(second.calls()).toBe(0)
  })

  it('refetches after the TTL', async () => {
    const updated = { ...catalog, name: '151 (updated)' }
    const { cache } = fakeCache()
    const { provider, calls, clock } = setup([catalog, updated], cache)
    await provider.getSet('sv03.5', 'pt')
    clock.now += DEFAULT_TTL_MS + 1
    expect(await provider.getSet('sv03.5', 'pt')).toEqual(updated)
    expect(calls()).toBe(2)
  })

  it('serves the stale entry when the inner provider fails', async () => {
    const { cache } = fakeCache()
    const { provider, clock } = setup([catalog, new ProviderError('UPSTREAM', 'down')], cache)
    await provider.getSet('sv03.5', 'pt')
    clock.now += DEFAULT_TTL_MS + 1
    expect(await provider.getSet('sv03.5', 'pt')).toEqual(catalog)
  })

  it('serves the newest stale entry when memory is newer than the Cache API', async () => {
    const { cache } = fakeCache()
    const older = { ...catalog, name: 'older' }
    const newer = { ...catalog, name: 'newer' }
    const first = setup([older], cache)
    await first.provider.getSet('sv03.5', 'pt')

    const failingCache: CacheLike = {
      match: cache.match,
      put: async () => {
        throw new Error('write failed')
      },
    }
    const second = setup([newer, new ProviderError('UPSTREAM', 'down')], failingCache)
    second.clock.now = first.clock.now + DEFAULT_TTL_MS + 1
    expect((await second.provider.getSet('sv03.5', 'pt'))?.name).toBe('newer')
    second.clock.now += DEFAULT_TTL_MS + 1
    expect((await second.provider.getSet('sv03.5', 'pt'))?.name).toBe('newer')
  })

  it('propagates the failure when nothing is cached', async () => {
    const { cache } = fakeCache()
    const { provider } = setup([new ProviderError('UPSTREAM', 'down')], cache)
    await expect(provider.getSet('sv03.5', 'pt')).rejects.toBeInstanceOf(ProviderError)
  })

  it('does not cache null', async () => {
    const { cache, store } = fakeCache()
    const { provider, calls } = setup([null, catalog], cache)
    expect(await provider.getSet('sv03.5', 'pt')).toBeNull()
    expect(store.size).toBe(0)
    expect(await provider.getSet('sv03.5', 'pt')).toEqual(catalog)
    expect(calls()).toBe(2)
  })

  it('works without a Cache API', async () => {
    const { inner, calls } = fakeInner([catalog])
    const provider = new CachedProvider(inner, {
      openCache: async () => {
        throw new Error('no caches here')
      },
    })
    expect(await provider.getSet('sv03.5', 'pt')).toEqual(catalog)
    expect(await provider.getSet('sv03.5', 'pt')).toEqual(catalog)
    expect(calls()).toBe(1)
  })
})
