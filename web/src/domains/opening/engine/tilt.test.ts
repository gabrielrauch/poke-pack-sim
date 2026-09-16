import { expect, it } from 'vitest'
import { createTilt, setTiltTarget, tiltFromOrientation, tiltFromPointer, updateTilt } from './tilt'

it('sensor: gamma/22 e (beta-45)/22, saturando em ±1', () => {
  expect(tiltFromOrientation(11, 45)).toEqual([0.5, 0])
  expect(tiltFromOrientation(-50, 100)).toEqual([-1, 1])
})

it('mouse: relativo ao centro do retângulo', () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 }
  expect(tiltFromPointer(100, 50, rect)).toEqual([0, 0])
  expect(tiltFromPointer(200, 0, rect)).toEqual([1, -1])
  expect(tiltFromPointer(-50, 500, rect)).toEqual([-1, 1])
})

it('lerp 0,1 rumo ao alvo e avisa quando assentou', () => {
  const t = createTilt()
  setTiltTarget(t, 1, -1)
  expect(updateTilt(t)).toBe(true)
  expect(t.x).toBeCloseTo(0.1)
  expect(t.y).toBeCloseTo(-0.1)
  for (let i = 0; i < 200; i++) updateTilt(t)
  expect(t.x).toBeCloseTo(1, 3)
  expect(updateTilt(t)).toBe(false)
})

it('clampa o alvo', () => {
  const t = createTilt()
  setTiltTarget(t, 5, -5)
  expect(t.tx).toBe(1)
  expect(t.ty).toBe(-1)
})
