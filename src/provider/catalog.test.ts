import { describe, expect, it } from 'vitest'
import { buildCatalog, type CatalogData } from './catalog'
import { ProviderError } from './errors'
import enFixture from './fixtures/sv03.5.en.json'
import ptFixture from './fixtures/sv03.5.pt.json'

const en = enFixture as CatalogData
const pt = ptFixture as CatalogData
const clone = <T>(value: T): T => structuredClone(value)

describe('buildCatalog', () => {
  it('merges en tiers with pt names and images, sorted by localId', () => {
    const catalog = buildCatalog('sv03.5', 'pt', en, pt)
    expect(catalog).not.toBeNull()
    expect(catalog!.id).toBe('sv03.5')
    expect(catalog!.lang).toBe('pt')
    expect(catalog!.total).toBe(207)
    expect(catalog!.cards).toHaveLength(207)
    expect(catalog!.logo).toBe(pt.set!.logo)
    expect(catalog!.symbol).toBe(pt.set!.symbol)

    const ns = catalog!.cards.map((c) => c.n)
    expect(ns).toEqual([...ns].sort())
    expect(ns[0]).toBe('001')

    const ptByLocalId = new Map(pt.cards.map((c) => [c.localId, c]))
    for (const card of catalog!.cards) {
      const source = ptByLocalId.get(card.n)!
      expect(card.name).toBe(source.name)
      expect(card.img).toBe(source.image)
    }
  })

  it('matches the sv03.5 tier histogram from the spec', () => {
    const catalog = buildCatalog('sv03.5', 'pt', en, pt)!
    const histogram: Record<string, number> = {}
    for (const card of catalog.cards) histogram[card.tier] = (histogram[card.tier] ?? 0) + 1
    expect(histogram).toEqual({
      common: 66,
      uncommon: 62,
      rare: 25,
      illustration_rare: 16,
      ultra_rare: 16,
      double_rare: 12,
      special_illustration_rare: 7,
      hyper_rare: 3,
    })
    const reverse = catalog.cards.filter((c) => c.reverse)
    expect(reverse).toHaveLength(153)
    expect(reverse.every((c) => ['common', 'uncommon', 'rare'].includes(c.tier))).toBe(true)
  })

  it('falls back to the en card when pt lacks it', () => {
    const partial = clone(pt)
    partial.cards = partial.cards.filter((c) => c.localId !== '025')
    const catalog = buildCatalog('sv03.5', 'pt', en, partial)!
    const enPikachu = en.cards.find((c) => c.localId === '025')!
    const card = catalog.cards.find((c) => c.n === '025')!
    expect(card.name).toBe(enPikachu.name)
    expect(card.img).toBe(enPikachu.image)
  })

  it('uses en for everything when there is no localized data', () => {
    const catalog = buildCatalog('sv03.5', 'pt', en, null)!
    expect(catalog.lang).toBe('pt')
    expect(catalog.name).toBe(en.set!.name)
    expect(catalog.cards[0]!.name).toBe(en.cards.find((c) => c.localId === '001')!.name)
  })

  it('ignores cards whose id does not start with the set prefix', () => {
    const noisy = clone(en)
    noisy.cards.push({ ...noisy.cards[0]!, id: 'sv03-001', localId: '001' })
    expect(buildCatalog('sv03.5', 'pt', noisy, pt)!.cards).toHaveLength(207)
  })

  it('returns null when the set does not exist', () => {
    expect(buildCatalog('nope', 'pt', { set: null, cards: [] }, null)).toBeNull()
  })

  it('fails when the card count does not match cardCount.total', () => {
    const short = clone(en)
    short.cards.pop()
    expect(() => buildCatalog('sv03.5', 'pt', short, pt)).toThrowError(ProviderError)
    try {
      buildCatalog('sv03.5', 'pt', short, pt)
    } catch (err) {
      expect((err as ProviderError).code).toBe('CARD_COUNT_MISMATCH')
    }
  })

  it('fails on a rarity without a tier', () => {
    const odd = clone(en)
    odd.cards[10]!.rarity = 'Amazing Rare'
    expect(() => buildCatalog('sv03.5', 'pt', odd, pt)).toThrowError(/Amazing Rare/)
    try {
      buildCatalog('sv03.5', 'pt', odd, pt)
    } catch (err) {
      expect((err as ProviderError).code).toBe('UNKNOWN_RARITY')
    }
  })
})
