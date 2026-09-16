import { describe, expect, it } from 'vitest'
import { buildCatalog, type CatalogData } from '../provider/catalog'
import enFixture from '../provider/fixtures/sv03.5.en.json'
import ptFixture from '../provider/fixtures/sv03.5.pt.json'
import type { Tier } from '../provider/types'
import { buildPack } from './builder'
import { parseRecipe } from './recipe'
import type { Seed } from './rng'
import sv from './recipes/sv.json'

const catalog = buildCatalog('sv03.5', 'pt', enFixture as CatalogData, ptFixture as CatalogData)!
const recipe = parseRecipe(sv)
const PACKS = 10_000

/** splitmix32: seeds bem espalhadas a partir do índice do pacote. */
function seedFor(index: number): Seed {
  let x = index >>> 0
  const next = () => {
    x = (x + 0x9e3779b9) >>> 0
    let z = x
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0
    return (z ^ (z >>> 16)) >>> 0
  }
  return [next(), next(), next(), next()]
}

function expectWithinTolerance(observed: number, expected: number, label: string) {
  const sigma = Math.sqrt((expected * (1 - expected)) / PACKS)
  const tolerance = 3 * sigma + 0.003
  expect(
    Math.abs(observed - expected),
    `${label}: observed ${observed.toFixed(4)}, expected ${expected.toFixed(4)}`,
  ).toBeLessThanOrEqual(tolerance)
}

describe('10k pack simulation with the sv recipe on sv03.5', () => {
  const rareSlot: Record<string, number> = {}
  const reverseSlot: Record<string, number> = {}
  let hits = 0

  for (let i = 0; i < PACKS; i++) {
    const { cards, hit } = buildPack({
      catalog,
      recipe,
      profile: { packsSinceHit: 0, favorites: [] },
      seed: seedFor(i),
    })
    const rare = cards[4]!.tier
    const reverse = cards[3]!.tier
    rareSlot[rare] = (rareSlot[rare] ?? 0) + 1
    reverseSlot[reverse] = (reverseSlot[reverse] ?? 0) + 1
    if (hit) hits++
  }

  const share = (pool: Partial<Record<Tier, number>>) => {
    const total = Object.values(pool).reduce((a, b) => a + b, 0)
    return Object.entries(pool).map(([tier, weight]) => [tier as Tier, weight / total] as const)
  }

  it.each(share(recipe.slots[2]!.pool))('rare slot draws %s at its weight', (tier, expected) => {
    expectWithinTolerance((rareSlot[tier] ?? 0) / PACKS, expected, tier)
  })

  it.each(share(recipe.slots[1]!.pool))('reverse slot draws %s at its weight', (tier, expected) => {
    expectWithinTolerance((reverseSlot[tier] ?? 0) / PACKS, expected, tier)
  })

  it('hit rate follows the hit tiers of the rare slot', () => {
    const pool = recipe.slots[2]!.pool
    const total = Object.values(pool).reduce((a, b) => a + b, 0)
    const expected = recipe.hit_tiers.reduce((sum, tier) => sum + (pool[tier] ?? 0), 0) / total
    expectWithinTolerance(hits / PACKS, expected, 'hit rate')
    console.log('rare slot histogram (10k packs):', rareSlot, `hits ${hits}`)
  })
})
