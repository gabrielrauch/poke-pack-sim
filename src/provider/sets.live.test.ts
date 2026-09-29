import { describe, expect, it } from 'vitest'
import { buildPack, missingTiers, recipeForSet, SETS, type Recipe } from '../pack'
import { TcgdexProvider } from './tcgdex'
import type { Tier } from './types'

/**
 * Confere os sets liberados contra o TCGdex de verdade (rede). Fora do `pnpm test`; roda com
 * `CHECK_SETS=1 pnpm vitest run src/provider/sets.live.test.ts`.
 */
// Sem @types/node no projeto: lê o env pelo globalThis.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env
const live = env?.CHECK_SETS === '1'

const drawn = (recipe: Recipe): Set<Tier> =>
  new Set(recipe.slots.flatMap((slot) => Object.keys(slot.pool) as Tier[]))

describe.skipIf(!live)('sets liberados no TCGdex', () => {
  const provider = new TcgdexProvider()

  it.each(SETS.map((set) => [set.id, set.name]))(
    '%s (%s): catálogo válido, tiers cobertos e 500 pacotes sem erro',
    async (id) => {
      const recipe = recipeForSet(id)!
      const catalog = await provider.getSet(id, 'pt')
      expect(catalog, 'set existe no TCGdex').not.toBeNull()
      expect(missingTiers(recipe, catalog!), 'tiers da recipe sem carta no set').toEqual([])
      // Carta num tier que a recipe não sorteia nunca sai e fica faltando no álbum para sempre.
      const never = [...new Set(catalog!.cards.map((c) => c.tier))].filter(
        (t) => !drawn(recipe).has(t),
      )
      expect(never, 'tiers do set que a recipe nunca sorteia').toEqual([])
      for (let i = 0; i < 500; i++) {
        const seed = [i + 1, i * 7 + 3, i * 13 + 5, i * 31 + 11] as const
        const { cards } = buildPack({
          catalog: catalog!,
          recipe,
          profile: { packsSinceHit: i % 8, favorites: [] },
          seed,
        })
        expect(cards).toHaveLength(recipe.size)
      }
    },
    60_000,
  )
})
