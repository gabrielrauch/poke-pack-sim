import type { CardProvider, SetCatalog } from './types'

/** Subconjunto de `Cache` (Workers Cache API) que o provider usa; `caches.default` serve direto. */
export type CacheLike = {
  match(request: RequestInfo | URL): Promise<Response | undefined>
  put(request: RequestInfo | URL, response: Response): Promise<void>
}

export type CachedOptions = {
  ttlMs?: number
  /** Abre o Cache API; `undefined` ou exceção desliga a camada persistente. */
  openCache?: () => Promise<CacheLike | undefined>
  now?: () => number
}

type Entry = { catalog: SetCatalog; fetchedAt: number }

export const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const CACHE_ORIGIN = 'https://provider.pack-sim.internal'
const FETCHED_AT_HEADER = 'x-fetched-at'
/** Bem maior que o TTL: a entrada vencida precisa continuar no Cache API para ser servida quando o TCGdex cair. */
const CACHE_MAX_AGE_S = 30 * 24 * 60 * 60

/** A memória pode ser mais nova que o Cache API quando um `#write` falhou. */
function newest(a: Entry | undefined, b: Entry | undefined): Entry | undefined {
  if (!a || !b) return a ?? b
  return a.fetchedAt >= b.fetchedAt ? a : b
}

/**
 * Memória do isolate (mais rápida, some com o isolate) na frente do Cache API (por datacenter).
 * Vencido + TCGdex fora = serve o vencido. Sem nada = propaga o erro.
 */
export class CachedProvider implements CardProvider {
  readonly #inner: CardProvider
  readonly #ttlMs: number
  readonly #openCache: () => Promise<CacheLike | undefined>
  readonly #now: () => number
  readonly #memory = new Map<string, Entry>()

  constructor(inner: CardProvider, options: CachedOptions = {}) {
    this.#inner = inner
    this.#ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
    this.#openCache = options.openCache ?? (async () => undefined)
    this.#now = options.now ?? Date.now
  }

  async getSet(setId: string, lang: string): Promise<SetCatalog | null> {
    const key = `/provider/${lang}/${setId}`
    const inMemory = this.#memory.get(key)
    if (inMemory && this.#isFresh(inMemory)) return inMemory.catalog

    const persisted = await this.#read(key)
    const stored = newest(persisted, inMemory)
    if (stored && this.#isFresh(stored)) {
      this.#memory.set(key, stored)
      return stored.catalog
    }

    try {
      const catalog = await this.#inner.getSet(setId, lang)
      if (!catalog) return null
      const entry: Entry = { catalog, fetchedAt: this.#now() }
      this.#memory.set(key, entry)
      await this.#write(key, entry)
      return catalog
    } catch (err) {
      if (!stored) throw err
      console.warn(`provider: serving stale ${key} after failure`, err)
      return stored.catalog
    }
  }

  #isFresh(entry: Entry) {
    return this.#now() - entry.fetchedAt < this.#ttlMs
  }

  #request(key: string) {
    return new Request(CACHE_ORIGIN + key)
  }

  async #cache(): Promise<CacheLike | undefined> {
    try {
      return await this.#openCache()
    } catch {
      return undefined
    }
  }

  async #read(key: string): Promise<Entry | undefined> {
    try {
      const cache = await this.#cache()
      const res = await cache?.match(this.#request(key))
      if (!res) return undefined
      const fetchedAt = Number(res.headers.get(FETCHED_AT_HEADER))
      if (!Number.isFinite(fetchedAt)) return undefined
      return { catalog: (await res.json()) as SetCatalog, fetchedAt }
    } catch (err) {
      console.warn(`provider: cache read failed for ${key}`, err)
      return undefined
    }
  }

  async #write(key: string, entry: Entry) {
    try {
      const cache = await this.#cache()
      if (!cache) return
      const res = new Response(JSON.stringify(entry.catalog), {
        headers: {
          'content-type': 'application/json',
          'cache-control': `public, max-age=${CACHE_MAX_AGE_S}`,
          [FETCHED_AT_HEADER]: String(entry.fetchedAt),
        },
      })
      await cache.put(this.#request(key), res)
    } catch (err) {
      console.warn(`provider: cache write failed for ${key}`, err)
    }
  }
}
