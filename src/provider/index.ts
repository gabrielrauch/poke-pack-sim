import { CachedProvider } from './cached'
import { TcgdexProvider } from './tcgdex'
import type { CardProvider } from './types'

/** Pilha de produção. Instancie uma vez no módulo do Worker: a memória vive com o isolate. */
export function createProvider(): CardProvider {
  return new CachedProvider(new TcgdexProvider(), { openCache: async () => caches.default })
}

export { ProviderError } from './errors'
export { TIER_ORDER } from './tiers'
export type { Card, CardProvider, SetCatalog, Tier } from './types'
