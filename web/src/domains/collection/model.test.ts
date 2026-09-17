import { describe, expect, it } from 'vitest'
import type { Card } from '../catalog/model'
import {
  buildAlbum,
  countsText,
  filterByTier,
  firstPulledText,
  ownedCount,
  progressText,
  tiersIn,
} from './model'

const c = (n: string, tier: Card['tier']): Card => ({
  n,
  name: `#${n}`,
  tier,
  reverse: true,
  img: null,
})
const cards = [c('025', 'common'), c('001', 'rare'), c('165', 'ultra_rare'), c('002', 'common')]
const owned = {
  '025': { normal: 2, reverse: 1, first: '2026-09-16T12:00:00.000Z' },
  '002': { normal: 0, reverse: 1, first: '2026-09-17T01:00:00.000Z' },
}

describe('álbum (§7.1)', () => {
  it('ordena por número e marca as possuídas', () => {
    const album = buildAlbum(cards, owned)
    expect(album.map((x) => x.n)).toEqual(['001', '002', '025', '165'])
    expect(album[0]!.owned).toBeNull()
    expect(album[2]!.owned).toEqual(owned['025'])
    expect(ownedCount(album)).toBe(2)
    expect(progressText(album)).toBe('2/4')
  })

  it('tiers presentes na ordem dos tiers, e filtro', () => {
    const album = buildAlbum(cards, owned)
    expect(tiersIn(album)).toEqual(['common', 'rare', 'ultra_rare'])
    expect(filterByTier(album, 'common').map((x) => x.n)).toEqual(['002', '025'])
    expect(filterByTier(album, null)).toHaveLength(4)
  })

  it('contagens e primeira puxada', () => {
    expect(countsText({ normal: 2, reverse: 1, first: '' })).toBe('2 normais · 1 reverse')
    expect(countsText({ normal: 1, reverse: 0, first: '' })).toBe('1 normal')
    expect(countsText({ normal: 0, reverse: 3, first: '' })).toBe('3 reverse')
    expect(firstPulledText('2026-09-16T12:00:00.000Z', 'America/Sao_Paulo')).toBe(
      'Primeira em 16 de set. de 2026',
    )
  })
})
