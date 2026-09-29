import { expect, it } from 'vitest'
import { CARD_LOOK, LIGHT_DIR, mergeLook } from './look'

it('mescla parcial sem perder os objetos aninhados', () => {
  const look = mergeLook(CARD_LOOK, { sheen: 0.5, tiltDeg: { x: 20, y: 13 } })
  expect(look.sheen).toBe(0.5)
  expect(look.tiltDeg).toEqual({ x: 20, y: 13 })
  expect(look.spring).toEqual(CARD_LOOK.spring)
  expect(CARD_LOOK.sheen).not.toBe(0.5)
})

it('ignora chaves estranhas de um JSON colado', () => {
  const look = mergeLook(CARD_LOOK, { banana: 1 } as never)
  expect(look).toEqual(CARD_LOOK)
})

it('luz normalizada, vinda de cima à esquerda e da frente', () => {
  const [x, y, z] = LIGHT_DIR
  expect(Math.hypot(x, y, z)).toBeCloseTo(1)
  expect(x).toBeLessThan(0)
  expect(y).toBeGreaterThan(0)
  expect(z).toBeGreaterThan(0.8)
})
