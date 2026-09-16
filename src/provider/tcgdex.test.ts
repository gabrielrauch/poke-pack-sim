import { describe, expect, it } from 'vitest'
import type { CatalogData } from './catalog'
import { ProviderError } from './errors'
import enFixture from './fixtures/sv03.5.en.json'
import ptFixture from './fixtures/sv03.5.pt.json'
import { TcgdexProvider } from './tcgdex'

const en = enFixture as CatalogData
const pt = ptFixture as CatalogData

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
}

/** fetch falso: devolve por idioma da query e conta tentativas por idioma. */
function fakeFetch(handler: (lang: string, attempt: number) => Response) {
  const calls: string[] = []
  const attempts = new Map<string, number>()
  const fn = async (_url: RequestInfo | URL, init?: RequestInit) => {
    const { variables } = JSON.parse(String(init?.body)) as { variables: { lang: string } }
    const attempt = (attempts.get(variables.lang) ?? 0) + 1
    attempts.set(variables.lang, attempt)
    calls.push(variables.lang)
    return handler(variables.lang, attempt)
  }
  return Object.assign(fn as unknown as typeof fetch, { calls })
}

function provider(fetchImpl: typeof fetch, delays: number[] = []) {
  return new TcgdexProvider({
    fetch: fetchImpl,
    sleep: async (ms) => {
      delays.push(ms)
    },
  })
}

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise
  } catch (err) {
    expect(err).toBeInstanceOf(ProviderError)
    return (err as ProviderError).code
  }
  throw new Error('expected rejection')
}

describe('TcgdexProvider', () => {
  it('queries en and the requested language and merges them', async () => {
    const fetchImpl = fakeFetch((lang) => json({ data: lang === 'en' ? en : pt }))
    const catalog = await provider(fetchImpl).getSet('sv03.5', 'pt')
    expect(catalog?.cards).toHaveLength(207)
    expect(catalog?.lang).toBe('pt')
    expect(fetchImpl.calls.sort()).toEqual(['en', 'pt'])
  })

  it('queries only once for en', async () => {
    const fetchImpl = fakeFetch(() => json({ data: en }))
    await provider(fetchImpl).getSet('sv03.5', 'en')
    expect(fetchImpl.calls).toEqual(['en'])
  })

  it('returns null when the set does not exist', async () => {
    const fetchImpl = fakeFetch(() => json({ data: { set: null, cards: [] } }))
    expect(await provider(fetchImpl).getSet('nope', 'pt')).toBeNull()
  })

  it('retries 503 with backoff and then succeeds', async () => {
    const delays: number[] = []
    const fetchImpl = fakeFetch((_lang, attempt) =>
      attempt < 3 ? new Response('no available server', { status: 503 }) : json({ data: en }),
    )
    const catalog = await provider(fetchImpl, delays).getSet('sv03.5', 'en')
    expect(catalog?.cards).toHaveLength(207)
    expect(fetchImpl.calls).toEqual(['en', 'en', 'en'])
    expect(delays).toEqual([300, 600])
  })

  it('gives up after the retries with UPSTREAM', async () => {
    const fetchImpl = fakeFetch(() => new Response('', { status: 503 }))
    expect(await codeOf(provider(fetchImpl).getSet('sv03.5', 'en'))).toBe('UPSTREAM')
    expect(fetchImpl.calls).toHaveLength(3)
  })

  it('retries network errors', async () => {
    const fetchImpl = fakeFetch((_lang, attempt) => {
      if (attempt === 1) throw new TypeError('fetch failed')
      return json({ data: en })
    })
    expect(await provider(fetchImpl).getSet('sv03.5', 'en')).not.toBeNull()
    expect(fetchImpl.calls).toHaveLength(2)
  })

  it('does not retry 4xx', async () => {
    const fetchImpl = fakeFetch(() => new Response('', { status: 400 }))
    expect(await codeOf(provider(fetchImpl).getSet('sv03.5', 'en'))).toBe('BAD_RESPONSE')
    expect(fetchImpl.calls).toHaveLength(1)
  })

  it('rejects non-JSON bodies without retrying', async () => {
    const fetchImpl = fakeFetch(
      () => new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    )
    expect(await codeOf(provider(fetchImpl).getSet('sv03.5', 'en'))).toBe('BAD_RESPONSE')
    expect(fetchImpl.calls).toHaveLength(1)
  })

  it('treats GraphQL errors (HTTP 200) as BAD_RESPONSE', async () => {
    const fetchImpl = fakeFetch(() =>
      json({ data: null, errors: [{ message: 'Cannot return null for non-nullable field' }] }),
    )
    expect(await codeOf(provider(fetchImpl).getSet('sv03.5', 'en'))).toBe('BAD_RESPONSE')
  })

  it('returns null for an unknown set even when the localized query fails', async () => {
    const fetchImpl = fakeFetch((lang) =>
      lang === 'en' ? json({ data: { set: null, cards: [] } }) : new Response('', { status: 503 }),
    )
    expect(await provider(fetchImpl).getSet('nope', 'pt')).toBeNull()
  })

  it('treats malformed JSON as BAD_RESPONSE without retrying', async () => {
    const fetchImpl = fakeFetch(
      () =>
        new Response('{not json', { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    expect(await codeOf(provider(fetchImpl).getSet('sv03.5', 'en'))).toBe('BAD_RESPONSE')
    expect(fetchImpl.calls).toHaveLength(1)
  })

  it('rejects data without set or cards as BAD_RESPONSE', async () => {
    const noSet = fakeFetch(() => json({ data: { cards: [] } }))
    expect(await codeOf(provider(noSet).getSet('sv03.5', 'en'))).toBe('BAD_RESPONSE')
    const noCards = fakeFetch(() => json({ data: { set: en.set } }))
    expect(await codeOf(provider(noCards).getSet('sv03.5', 'en'))).toBe('BAD_RESPONSE')
  })

  it('surfaces catalog errors from the merge', async () => {
    const short: CatalogData = { set: en.set, cards: en.cards.slice(1) }
    const fetchImpl = fakeFetch(() => json({ data: short }))
    expect(await codeOf(provider(fetchImpl).getSet('sv03.5', 'en'))).toBe('CARD_COUNT_MISMATCH')
  })
})
