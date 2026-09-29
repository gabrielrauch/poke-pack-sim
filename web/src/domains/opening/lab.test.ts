import { expect, it } from 'vitest'
import { CARD_LOOK } from './engine/look'
import {
  BENCH_CARDS,
  BENCH_SLIDERS,
  benchExport,
  benchValue,
  LAB_ART,
  LAB_TIERS,
  labBenchFromUrl,
  labPack,
  labTierFromUrl,
  withBenchValue,
} from './lab'

it('pacote falso: 5 cartas reais do sv03.5, uma reverse, a última no tier pedido', () => {
  const pack = labPack('hyper_rare')
  expect(pack).toHaveLength(5)
  expect(pack[4]!.tier).toBe('hyper_rare')
  expect(pack[4]!.n).toBe('205')
  expect(pack.filter((c) => c.reverse)).toHaveLength(1)
  expect(new Set(pack.map((c) => c.n)).size).toBe(5)
  for (const c of pack) expect(c.img).toBe(`https://assets.tcgdex.net/pt/sv/sv03.5/${c.n}`)
  expect(LAB_ART.logo).toBe('/api/img/pt/sv/sv03.5/logo.png')
})

it('tier pela URL, com padrão special_illustration_rare', () => {
  expect(labTierFromUrl('?tier=hyper_rare')).toBe('hyper_rare')
  expect(labTierFromUrl('?tier=banana')).toBe('special_illustration_rare')
  expect(labTierFromUrl('')).toBe('special_illustration_rare')
  expect(LAB_TIERS).toContain('double_rare')
})

it('bancada: uma carta por tier do lab, mais a comum e a reverse', () => {
  expect(BENCH_CARDS).toHaveLength(LAB_TIERS.length + 2)
  expect(BENCH_CARDS.filter((c) => c.reverse)).toHaveLength(1)
  expect(labBenchFromUrl('?bancada')).toBe(true)
  expect(labBenchFromUrl('?tier=rare')).toBe(false)
})

it('bancada: cada controle lê e escreve o seu número', () => {
  const finish = { foil: 0.4, edgeStrength: 0.3, sparkle: 1, gold: 0 }
  for (const sl of BENCH_SLIDERS) {
    const v = (sl.min + sl.max) / 2
    const look = withBenchValue(CARD_LOOK, sl.key, v)
    if (sl.group === 'look') expect(benchValue(look, finish, sl.key)).toBe(v)
    else expect(look).toBe(CARD_LOOK)
    expect(benchValue(CARD_LOOK, finish, sl.key)).toBeGreaterThanOrEqual(sl.min)
    expect(benchValue(CARD_LOOK, finish, sl.key)).toBeLessThanOrEqual(sl.max)
  }
})

it('bancada: "Copiar valores" só leva o que mudou', () => {
  const card = BENCH_CARDS.at(-1)!
  expect(JSON.parse(benchExport(CARD_LOOK, card, {}))).toEqual({ look: {} })
  const look = withBenchValue(CARD_LOOK, 'damping', 20)
  const out = JSON.parse(benchExport(look, card, { foil: 0.9, gold: 1 }))
  expect(out.look).toEqual({ spring: { ...CARD_LOOK.spring, damping: 20 } })
  expect(out.finish).toEqual({ tier: card.tier, reverse: false, foil: 0.9 })
})
