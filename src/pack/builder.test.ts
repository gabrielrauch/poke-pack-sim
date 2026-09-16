import { describe, expect, it } from 'vitest'
import { buildCatalog, type CatalogData } from '../provider/catalog'
import enFixture from '../provider/fixtures/sv03.5.en.json'
import ptFixture from '../provider/fixtures/sv03.5.pt.json'
import { TIER_ORDER } from '../provider/tiers'
import type { Card, SetCatalog, Tier } from '../provider/types'
import { buildPack, type BuildInput } from './builder'
import { PackError } from './errors'
import { parseRecipe, type Recipe } from './recipe'
import type { Seed } from './rng'
import sv from './recipes/sv.json'

const catalog = buildCatalog('sv03.5', 'pt', enFixture as CatalogData, ptFixture as CatalogData)!
const recipe = parseRecipe(sv)
const byN = new Map(catalog.cards.map((c) => [c.n, c]))
/** splitmix32: seeds bem espalhadas a partir de um índice, como o Worker faz com SHA-256. */
function seedOf(index: number): Seed {
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
const tierIndex = (tier: Tier) => TIER_ORDER.indexOf(tier)

function input(overrides: Partial<BuildInput> = {}): BuildInput {
  return {
    catalog,
    recipe,
    profile: { packsSinceHit: 0, favorites: [] },
    seed: seedOf(1),
    ...overrides,
  }
}

function card(n: string, tier: Tier, reverse = true): Card {
  return { n, name: `card ${n}`, tier, reverse, img: null }
}

function mini(cards: Card[]): SetCatalog {
  return {
    id: 'mini',
    name: 'mini',
    lang: 'pt',
    total: cards.length,
    logo: null,
    symbol: null,
    cards,
  }
}

function miniRecipe(overrides: Partial<Recipe>): Recipe {
  return { ...structuredClone(recipe), ...overrides }
}

describe('buildPack', () => {
  it('is deterministic for the same seed', () => {
    expect(buildPack(input())).toEqual(buildPack(input()))
    expect(buildPack(input({ seed: seedOf(2) })).cards).not.toEqual(buildPack(input()).cards)
  })

  it('returns size cards, no duplicates, rare slot last', () => {
    for (let i = 0; i < 200; i++) {
      const { cards } = buildPack(input({ seed: seedOf(i) }))
      expect(cards).toHaveLength(recipe.size)
      expect(new Set(cards.map((c) => c.n)).size).toBe(recipe.size)
      const last = cards[cards.length - 1]!
      expect(Object.keys(recipe.slots[2]!.pool)).toContain(last.tier)
      for (const c of cards) {
        const source = byN.get(c.n)!
        expect(c.name).toBe(source.name)
        expect(c.img).toBe(source.img)
        expect(c.tier).toBe(source.tier)
      }
    }
  })

  it('marks only the reverse slot as reverse, from cards that have the variant', () => {
    for (let i = 0; i < 200; i++) {
      const { cards } = buildPack(input({ seed: seedOf(i) }))
      expect(cards.map((c) => c.variant)).toEqual([
        'normal',
        'normal',
        'normal',
        'reverse',
        'normal',
      ])
      expect(byN.get(cards[3]!.n)!.reverse).toBe(true)
    }
  })

  it('reports hits and resets or increments packsSinceHit', () => {
    let hits = 0
    for (let i = 0; i < 300; i++) {
      const result = buildPack(
        input({ seed: seedOf(i), profile: { packsSinceHit: 4, favorites: [] } }),
      )
      const hasHit = result.cards.some((c) => recipe.hit_tiers.includes(c.tier))
      expect(result.hit).toBe(hasHit)
      expect(result.packsSinceHit).toBe(hasHit ? 0 : 5)
      if (hasHit) hits++
    }
    expect(hits).toBeGreaterThan(30)
    expect(hits).toBeLessThan(150)
  })

  it('pity locks the rare slot to min_tier or above exactly from `after`', () => {
    const min = tierIndex(recipe.pity.min_tier)
    for (let i = 0; i < 200; i++) {
      const locked = buildPack(
        input({ seed: seedOf(i), profile: { packsSinceHit: 6, favorites: [] } }),
      )
      expect(tierIndex(locked.cards[4]!.tier)).toBeGreaterThanOrEqual(min)
      expect(locked.hit).toBe(true)
      expect(locked.packsSinceHit).toBe(0)
    }
    const below = Array.from({ length: 200 }, (_, i) =>
      buildPack(input({ seed: seedOf(i), profile: { packsSinceHit: 5, favorites: [] } })),
    )
    expect(below.some((r) => tierIndex(r.cards[4]!.tier) < min)).toBe(true)
  })

  it('pity falls back to min_tier alone when the pool has nothing at or above it', () => {
    const only = miniRecipe({
      slots: [{ count: 1, pool: { common: 1 } }],
      size: 1,
      pity: { after: 1, min_tier: 'rare' },
    })
    const { cards } = buildPack(
      input({ recipe: only, profile: { packsSinceHit: 1, favorites: [] } }),
    )
    expect(cards[0]!.tier).toBe('rare')
  })

  it('falls back one tier at a time when a tier has no card', () => {
    const cards = [card('001', 'common'), card('002', 'uncommon'), card('003', 'common')]
    const one = miniRecipe({ slots: [{ count: 1, pool: { hyper_rare: 1 } }], size: 1 })
    const { cards: drawn } = buildPack(input({ catalog: mini(cards), recipe: one }))
    expect(drawn[0]!.tier).toBe('uncommon')
  })

  it('falls back when the reverse slot has no card with the variant', () => {
    const cards = [
      card('001', 'common'),
      card('002', 'uncommon', false),
      card('003', 'rare', false),
    ]
    const one = miniRecipe({ slots: [{ count: 1, reverse: true, pool: { rare: 1 } }], size: 1 })
    const { cards: drawn } = buildPack(input({ catalog: mini(cards), recipe: one }))
    expect(drawn[0]).toMatchObject({ n: '001', variant: 'reverse' })
  })

  it('fails when the tier and everything below it are exhausted', () => {
    const cards = [card('001', 'common'), card('002', 'common')]
    const three = miniRecipe({ slots: [{ count: 3, pool: { common: 1 } }], size: 3 })
    expect(() => buildPack(input({ catalog: mini(cards), recipe: three }))).toThrow(PackError)
    expect(() => buildPack(input({ catalog: mini([]), recipe: three }))).toThrow(/mini/)
  })

  it('favorites are drawn more often within their tier', () => {
    const cards = [card('001', 'common'), card('002', 'common')]
    const one = miniRecipe({
      slots: [{ count: 1, pool: { common: 1 } }],
      size: 1,
      favorites_multiplier: 1000,
    })
    let favorite = 0
    for (let i = 0; i < 100; i++) {
      const { cards: drawn } = buildPack(
        input({
          catalog: mini(cards),
          recipe: one,
          seed: seedOf(i),
          profile: { packsSinceHit: 0, favorites: ['card 002'] },
        }),
      )
      if (drawn[0]!.n === '002') favorite++
    }
    expect(favorite).toBeGreaterThanOrEqual(95)
  })
})
