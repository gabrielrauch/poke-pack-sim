import { TIER_ORDER } from '../provider/tiers'
import type { Card, SetCatalog, Tier } from '../provider/types'
import { PackError } from './errors'
import type { Pool, Recipe } from './recipe'
import { createRng, pickWeighted, type Seed } from './rng'

/** Carta como vai para `packs.cards` no D1: histórico e reabertura nunca dependem do provider. */
export type PackCard = {
  n: string
  name: string
  tier: Tier
  img: string | null
  variant: 'normal' | 'reverse'
}

export type BuildInput = {
  catalog: SetCatalog
  recipe: Recipe
  profile: { packsSinceHit: number; favorites: readonly string[] }
  seed: Seed
}

export type BuildResult = { cards: PackCard[]; hit: boolean; packsSinceHit: number }

type PoolEntries = ReadonlyArray<readonly [Tier, number]>

const poolEntries = (pool: Pool): PoolEntries => Object.entries(pool) as [Tier, number][]

/**
 * Por slot: sorteio ponderado do tier, depois da carta dentro do tier (favoritas × multiplicador),
 * sem repetir carta. O último slot da recipe é o slot raro: pity age nele, e ele sai por último.
 */
export function buildPack({ catalog, recipe, profile, seed }: BuildInput): BuildResult {
  const rng = createRng(seed)
  const favorites = new Set(profile.favorites)
  const taken = new Set<string>()
  const cards: PackCard[] = []
  const rareSlot = recipe.slots.length - 1
  const pityActive = profile.packsSinceHit >= recipe.pity.after

  recipe.slots.forEach((slot, index) => {
    const locked = index === rareSlot && pityActive
    const pool = locked
      ? withPity(poolEntries(slot.pool), recipe.pity.min_tier)
      : poolEntries(slot.pool)
    const floor = locked ? recipe.pity.min_tier : TIER_ORDER[0]
    const reverse = slot.reverse === true
    for (let i = 0; i < slot.count; i++) {
      const tier = pickWeighted(rng, pool)
      const candidates = available(catalog, tier, floor, reverse, taken)
      const weighted = candidates.map(
        (c) => [c, favorites.has(c.name) ? recipe.favorites_multiplier : 1] as const,
      )
      const card = pickWeighted(rng, weighted)
      taken.add(card.n)
      cards.push({
        n: card.n,
        name: card.name,
        tier: card.tier,
        img: card.img,
        variant: reverse ? 'reverse' : 'normal',
      })
    }
  })

  const hit = cards.some((c) => recipe.hit_tiers.includes(c.tier))
  return { cards, hit, packsSinceHit: hit ? 0 : profile.packsSinceHit + 1 }
}

/** Mantém só os tiers >= min_tier; se não sobrar nenhum, o slot vira o próprio min_tier. */
function withPity(pool: PoolEntries, minTier: Tier): PoolEntries {
  const min = TIER_ORDER.indexOf(minTier)
  const kept = pool.filter(([tier]) => TIER_ORDER.indexOf(tier) >= min)
  return kept.length > 0 ? kept : [[minTier, 1]]
}

/** Cartas sorteáveis no tier; tier sem nada cai um abaixo, até `floor` (`common`, ou `min_tier` sob pity). Abaixo disso é erro de configuração. */
function available(
  catalog: SetCatalog,
  tier: Tier,
  floor: Tier,
  reverse: boolean,
  taken: Set<string>,
): Card[] {
  for (let i = TIER_ORDER.indexOf(tier); i >= TIER_ORDER.indexOf(floor); i--) {
    const current = TIER_ORDER[i]!
    const found = catalog.cards.filter(
      (c) => c.tier === current && !taken.has(c.n) && (!reverse || c.reverse),
    )
    if (found.length > 0) return found
  }
  throw new PackError(`no card available for tier ${tier} down to ${floor} in set ${catalog.id}`)
}
