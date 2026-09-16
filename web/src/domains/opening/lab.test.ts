import { expect, it } from 'vitest'
import { LAB_ART, LAB_TIERS, labPack, labTierFromUrl } from './lab'

it('pacote falso: 5 cartas reais do sv03.5, uma reverse, a última no tier pedido', () => {
  const pack = labPack('hyper_rare')
  expect(pack).toHaveLength(5)
  expect(pack[4]!.tier).toBe('hyper_rare')
  expect(pack[4]!.n).toBe('205')
  expect(pack.filter((c) => c.reverse)).toHaveLength(1)
  expect(new Set(pack.map((c) => c.n)).size).toBe(5)
  for (const c of pack) expect(c.img).toBe(`https://assets.tcgdex.net/pt/sv/sv03.5/${c.n}`)
  expect(LAB_ART.logo).toBe('https://assets.tcgdex.net/pt/sv/sv03.5/logo.png')
})

it('tier pela URL, com padrão special_illustration_rare', () => {
  expect(labTierFromUrl('?tier=hyper_rare')).toBe('hyper_rare')
  expect(labTierFromUrl('?tier=banana')).toBe('special_illustration_rare')
  expect(labTierFromUrl('')).toBe('special_illustration_rare')
  expect(LAB_TIERS).toContain('double_rare')
})
