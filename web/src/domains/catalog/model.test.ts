import { expect, it } from 'vitest'
import { cardImage, GOLD_TIERS, HIT_TIERS, isHit, proxiedImage } from './model'

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
