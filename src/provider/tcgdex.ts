import { buildCatalog, type CatalogData } from './catalog'
import { ProviderError } from './errors'
import { CATALOG_QUERY, TCGDEX_GRAPHQL, catalogVariables } from './query'
import type { CardProvider, SetCatalog } from './types'

export type TcgdexOptions = {
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  /** Tentativas extras em 5xx ou erro de rede. */
  retries?: number
  endpoint?: string
}

type GqlResponse = { data?: CatalogData | null; errors?: { message: string }[] }

const RETRY_BASE_MS = 300
const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Cliente GraphQL do TCGdex. Duas queries por set (en para tier, idioma pedido para nome e imagem). */
export class TcgdexProvider implements CardProvider {
  readonly #fetch: typeof fetch
  readonly #sleep: (ms: number) => Promise<void>
  readonly #retries: number
  readonly #endpoint: string

  constructor(options: TcgdexOptions = {}) {
    this.#fetch = options.fetch ?? ((input, init) => fetch(input, init))
    this.#sleep = options.sleep ?? defaultSleep
    this.#retries = options.retries ?? 2
    this.#endpoint = options.endpoint ?? TCGDEX_GRAPHQL
  }

  async getSet(setId: string, lang: string): Promise<SetCatalog | null> {
    // Paralelo, mas set inexistente em `en` é `null` mesmo que a query localizada falhe.
    const [enResult, localizedResult] = await Promise.allSettled([
      this.#query(setId, 'en'),
      lang === 'en' ? Promise.resolve(null) : this.#query(setId, lang),
    ])
    if (enResult.status === 'rejected') throw enResult.reason
    if (!enResult.value.set) return null
    if (localizedResult.status === 'rejected') throw localizedResult.reason
    return buildCatalog(setId, lang, enResult.value, localizedResult.value)
  }

  async #query(setId: string, lang: string): Promise<CatalogData> {
    const body = JSON.stringify({ query: CATALOG_QUERY, variables: catalogVariables(setId, lang) })
    let lastError: unknown
    for (let attempt = 0; attempt <= this.#retries; attempt++) {
      if (attempt > 0) await this.#sleep(RETRY_BASE_MS * 2 ** (attempt - 1))
      try {
        return await this.#request(body)
      } catch (err) {
        if (err instanceof ProviderError && err.code !== 'UPSTREAM') throw err
        lastError = err
      }
    }
    throw new ProviderError('UPSTREAM', `TCGdex unavailable after ${this.#retries + 1} attempts`, {
      cause: lastError,
    })
  }

  async #request(body: string): Promise<CatalogData> {
    const res = await this.#fetch(this.#endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body,
    })
    if (res.status >= 500) throw new ProviderError('UPSTREAM', `TCGdex responded ${res.status}`)
    if (!res.ok) throw new ProviderError('BAD_RESPONSE', `TCGdex responded ${res.status}`)
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('application/json')) {
      throw new ProviderError('BAD_RESPONSE', `TCGdex content-type ${type || 'missing'}`)
    }
    let json: GqlResponse
    try {
      json = (await res.json()) as GqlResponse
    } catch (err) {
      throw new ProviderError('BAD_RESPONSE', 'TCGdex returned malformed JSON', { cause: err })
    }
    if (json.errors?.length) {
      const messages = json.errors.map((e) => e.message).join('; ')
      throw new ProviderError('BAD_RESPONSE', `TCGdex GraphQL errors: ${messages}`)
    }
    const data = json.data
    if (!data || typeof data !== 'object' || !('set' in data) || !Array.isArray(data.cards)) {
      throw new ProviderError('BAD_RESPONSE', 'TCGdex GraphQL data is missing set or cards')
    }
    return data
  }
}
