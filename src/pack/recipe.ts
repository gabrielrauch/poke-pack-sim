import { TIER_ORDER } from '../provider/tiers'
import type { SetCatalog, Tier } from '../provider/types'
import { PackError } from './errors'

/** Pesos relativos por tier (não são as chances impressas). */
export type Pool = Partial<Record<Tier, number>>
export type Slot = { count: number; reverse?: boolean; pool: Pool }
export type Recipe = {
  size: number
  slots: Slot[]
  hit_tiers: Tier[]
  pity: { after: number; min_tier: Tier }
  favorites_multiplier: number
  allowance: { daily: number; cap: number }
}

const TIERS = new Set<string>(TIER_ORDER)
const isTier = (value: unknown): value is Tier => typeof value === 'string' && TIERS.has(value)
const isPositive = (value: unknown): value is number => typeof value === 'number' && value > 0
const isPositiveInt = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new PackError(`invalid recipe: ${message}`)
}

/** Valida um JSON de recipe antes de sortear com ele. Mensagens apontam o campo. */
export function parseRecipe(raw: unknown): Recipe {
  check(isRecord(raw), 'not an object')
  check(Array.isArray(raw.slots) && raw.slots.length > 0, 'slots must be a non-empty array')
  let total = 0
  for (const slot of raw.slots as unknown[]) {
    check(isRecord(slot) && isPositiveInt(slot.count), 'slot.count must be a positive integer')
    check(
      slot.reverse === undefined || typeof slot.reverse === 'boolean',
      'slot.reverse must be a boolean',
    )
    check(
      isRecord(slot.pool) && Object.keys(slot.pool).length > 0,
      'slot.pool must have at least one tier',
    )
    for (const [tier, weight] of Object.entries(slot.pool)) {
      check(isTier(tier), `unknown tier "${tier}" in slot.pool`)
      check(isPositive(weight), `weight of "${tier}" must be positive`)
    }
    total += slot.count as number
  }
  check(raw.size === total, `size must equal the sum of slot counts (${total})`)
  check(
    Array.isArray(raw.hit_tiers) && raw.hit_tiers.every(isTier),
    'hit_tiers must list known tiers',
  )
  check(
    isRecord(raw.pity) && isPositiveInt(raw.pity.after) && isTier(raw.pity.min_tier),
    'pity needs after (positive integer) and min_tier',
  )
  check(isPositive(raw.favorites_multiplier), 'favorites_multiplier must be positive')
  check(
    isRecord(raw.allowance) &&
      isPositiveInt(raw.allowance.daily) &&
      isPositiveInt(raw.allowance.cap) &&
      (raw.allowance.cap as number) >= (raw.allowance.daily as number),
    'allowance needs daily > 0 and cap >= daily',
  )
  return raw as Recipe
}

/** Tiers que a recipe referencia (pools e pity) e que não têm nenhuma carta no set. O Worker decide o que fazer. */
export function missingTiers(recipe: Recipe, catalog: SetCatalog): Tier[] {
  const present = new Set(catalog.cards.map((c) => c.tier))
  const referenced = new Set<Tier>([recipe.pity.min_tier])
  for (const slot of recipe.slots)
    for (const tier of Object.keys(slot.pool) as Tier[]) referenced.add(tier)
  return [...referenced].filter((tier) => !present.has(tier))
}
