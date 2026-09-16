import { describe, expect, it } from 'vitest'
import { TIER_ORDER, tierOf } from './tiers'
import type { Tier } from './types'

const table: [string, Tier][] = [
  ['Common', 'common'],
  ['Uncommon', 'uncommon'],
  ['Rare', 'rare'],
  ['Rare Holo', 'holo'],
  ['Holo Rare', 'holo'],
  ['Double rare', 'double_rare'],
  ['Illustration rare', 'illustration_rare'],
  ['Ultra Rare', 'ultra_rare'],
  ['Special illustration rare', 'special_illustration_rare'],
  ['Hyper rare', 'hyper_rare'],
  ['ACE SPEC Rare', 'ace_spec'],
  ['Shiny rare', 'shiny_rare'],
  ['Shiny Ultra Rare', 'shiny_ultra_rare'],
  ['Black White Rare', 'black_white_rare'],
  ['Mega Hyper Rare', 'mega_hyper_rare'],
]

describe('tierOf', () => {
  it.each(table)('maps %s to %s', (rarity, tier) => {
    expect(tierOf(rarity)).toBe(tier)
  })

  it('ignores case', () => {
    expect(tierOf('double RARE')).toBe('double_rare')
  })

  it('returns null for rarities without a tier', () => {
    expect(tierOf('Promo')).toBeNull()
    expect(tierOf('None')).toBeNull()
    expect(tierOf('Amazing Rare')).toBeNull()
    expect(tierOf(null)).toBeNull()
    expect(tierOf(undefined)).toBeNull()
  })
})

describe('TIER_ORDER', () => {
  it('lists every mapped tier exactly once, lowest first', () => {
    const mapped = new Set(table.map(([, tier]) => tier))
    expect(new Set(TIER_ORDER).size).toBe(TIER_ORDER.length)
    expect(new Set(TIER_ORDER)).toEqual(mapped)
    expect(TIER_ORDER[0]).toBe('common')
    expect(TIER_ORDER.indexOf('rare')).toBeLessThan(TIER_ORDER.indexOf('illustration_rare'))
  })
})
