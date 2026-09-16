import { ProviderError } from './errors'
import { tierOf } from './tiers'
import type { Card, SetCatalog } from './types'

export type GqlCard = {
  id: string
  localId: string
  name: string | null
  rarity: string | null
  category: string | null
  image: string | null
  variants: { normal: boolean | null; reverse: boolean | null; holo: boolean | null } | null
}

export type GqlSet = {
  id: string
  name: string
  logo: string | null
  symbol: string | null
  cardCount: { official: number; total: number }
}

/** `data` de uma resposta da CATALOG_QUERY. */
export type CatalogData = { set: GqlSet | null; cards: GqlCard[] }

const byLocalId = (a: Card, b: Card) => (a.n < b.n ? -1 : a.n > b.n ? 1 : 0)

/**
 * Tier vem da raridade em `en`; nome e imagem vêm de `localized`, com fallback carta a carta para `en`.
 * Cartas em ordem de localId (string) para o pack builder ser determinístico entre buscas.
 */
export function buildCatalog(
  setId: string,
  lang: string,
  en: CatalogData,
  localized: CatalogData | null,
): SetCatalog | null {
  if (!en.set) return null
  const prefix = `${setId}-`
  const enCards = en.cards.filter((c) => c.id.startsWith(prefix))
  if (enCards.length !== en.set.cardCount.total) {
    throw new ProviderError(
      'CARD_COUNT_MISMATCH',
      `${setId}: got ${enCards.length} cards, cardCount.total is ${en.set.cardCount.total}`,
    )
  }

  const localizedCards = new Map<string, GqlCard>()
  for (const card of localized?.cards ?? []) {
    if (card.id.startsWith(prefix)) localizedCards.set(card.localId, card)
  }

  const cards = enCards
    .map((card): Card => {
      const tier = tierOf(card.rarity)
      if (!tier) {
        throw new ProviderError(
          'UNKNOWN_RARITY',
          `${card.id}: rarity ${JSON.stringify(card.rarity)} has no tier`,
        )
      }
      const local = localizedCards.get(card.localId)
      return {
        n: card.localId,
        name: local?.name ?? card.name ?? card.localId,
        tier,
        reverse: card.variants?.reverse === true,
        img: local?.image ?? card.image ?? null,
      }
    })
    .sort(byLocalId)

  const set = localized?.set ?? en.set
  return {
    id: en.set.id,
    name: set.name,
    lang,
    total: en.set.cardCount.total,
    logo: set.logo ?? en.set.logo,
    symbol: set.symbol ?? en.set.symbol,
    cards,
  }
}
