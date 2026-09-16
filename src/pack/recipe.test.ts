import { describe, expect, it } from 'vitest'
import { buildCatalog, type CatalogData } from '../provider/catalog'
import enFixture from '../provider/fixtures/sv03.5.en.json'
import ptFixture from '../provider/fixtures/sv03.5.pt.json'
import type { SetCatalog } from '../provider/types'
import { PackError } from './errors'
import { missingTiers, parseRecipe, type Recipe } from './recipe'
import { recipeForSet } from './recipes'
import sv from './recipes/sv.json'

const catalog = buildCatalog('sv03.5', 'pt', enFixture as CatalogData, ptFixture as CatalogData)!
const valid = (): Recipe => structuredClone(sv) as Recipe

describe('parseRecipe', () => {
  it('accepts sv.json', () => {
    const recipe = parseRecipe(sv)
    expect(recipe.size).toBe(5)
    expect(recipe.slots).toHaveLength(3)
    expect(recipe.slots[1]?.reverse).toBe(true)
    expect(recipe.hit_tiers).toContain('hyper_rare')
  })

  it.each<[string, (r: Recipe) => unknown, string]>([
    ['not an object', () => null, 'not an object'],
    ['empty slots', (r) => ({ ...r, slots: [] }), 'slots'],
    ['zero count', (r) => ((r.slots[0]!.count = 0), r), 'count'],
    [
      'non-boolean reverse',
      (r) => (((r.slots[0] as { reverse: unknown }).reverse = 'yes'), r),
      'reverse',
    ],
    ['empty pool', (r) => ((r.slots[0]!.pool = {}), r), 'pool'],
    [
      'unknown tier',
      (r) => (((r.slots[0]!.pool as Record<string, number>).mythic = 1), r),
      'mythic',
    ],
    ['zero weight', (r) => ((r.slots[0]!.pool.common = 0), r), 'common'],
    ['infinite weight', (r) => ((r.slots[0]!.pool.common = Number.POSITIVE_INFINITY), r), 'common'],
    ['nan multiplier', (r) => ({ ...r, favorites_multiplier: Number.NaN }), 'favorites_multiplier'],
    ['size mismatch', (r) => ({ ...r, size: 4 }), 'size'],
    ['bad hit tier', (r) => ({ ...r, hit_tiers: ['rare', 'nope'] }), 'hit_tiers'],
    ['bad pity', (r) => ({ ...r, pity: { after: 0, min_tier: 'rare' } }), 'pity'],
    ['bad multiplier', (r) => ({ ...r, favorites_multiplier: -1 }), 'favorites_multiplier'],
    ['cap below daily', (r) => ({ ...r, allowance: { daily: 3, cap: 2 } }), 'allowance'],
  ])('rejects %s', (_label, mutate, fragment) => {
    const raw = mutate(valid())
    expect(() => parseRecipe(raw)).toThrow(PackError)
    expect(() => parseRecipe(raw)).toThrow(fragment)
  })
})

describe('missingTiers', () => {
  it('is empty for sv03.5 with the sv recipe', () => {
    expect(missingTiers(parseRecipe(sv), catalog)).toEqual([])
  })

  it('lists pool and pity tiers absent from the set', () => {
    const tiny: SetCatalog = { ...catalog, cards: catalog.cards.filter((c) => c.tier === 'common') }
    const missing = missingTiers(parseRecipe(sv), tiny)
    expect(missing).toContain('uncommon')
    expect(missing).toContain('hyper_rare')
    expect(missing).toContain('illustration_rare')
    expect(missing).not.toContain('common')
    expect(new Set(missing).size).toBe(missing.length)
  })
})

describe('recipeForSet', () => {
  it('maps a set id to its series recipe', () => {
    expect(recipeForSet('sv03.5')?.size).toBe(5)
    expect(recipeForSet('sv01')?.size).toBe(5)
  })

  it('returns null for a series without a recipe', () => {
    expect(recipeForSet('swsh12.5')).toBeNull()
  })
})
