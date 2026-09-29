import { expect, it } from 'vitest'
import {
  cardImage,
  DEFAULT_SET,
  GOLD_TIERS,
  HIT_TIERS,
  isHit,
  packArt,
  proxiedImage,
  resolveSet,
  SETS,
} from './model'

it('hit tiers vêm da recipe sv', () => {
  expect([...HIT_TIERS]).toEqual([
    'illustration_rare',
    'ultra_rare',
    'special_illustration_rare',
    'hyper_rare',
  ])
  expect(isHit('rare')).toBe(false)
  expect(GOLD_TIERS.has('illustration_rare')).toBe(false)
})

it('cardImage monta a URL e respeita null', () => {
  expect(cardImage('https://assets.tcgdex.net/pt/sv/sv03.5/001', 'high')).toBe(
    '/api/img/pt/sv/sv03.5/001/high.webp',
  )
  expect(proxiedImage('https://assets.tcgdex.net/pt/sv/sv03.5/logo.png')).toBe(
    '/api/img/pt/sv/sv03.5/logo.png',
  )
  expect(proxiedImage('https://other.example/x.png')).toBe('https://other.example/x.png')
  expect(cardImage(null, 'low')).toBeNull()
})

it('arte procedural do pacote a partir do catálogo (logo pelo passthrough)', () => {
  expect(packArt({ name: '151', logo: 'https://assets.tcgdex.net/pt/sv/sv03.5/logo' })).toEqual({
    name: '151',
    subtitle: '5 cartas',
    logo: '/api/img/pt/sv/sv03.5/logo.png',
  })
  expect(packArt({ name: 'X', logo: null }).logo).toBeNull()
  expect(DEFAULT_SET).toBe('sv03.5')
})

it('resolveSet mantém um set da lista e cai no 151 fora dela', () => {
  expect(resolveSet('sv02')).toBe('sv02')
  expect(resolveSet(null)).toBe('sv03.5')
  expect(resolveSet('swsh12')).toBe('sv03.5')
  expect(SETS[0]?.id).toBe(DEFAULT_SET)
})
