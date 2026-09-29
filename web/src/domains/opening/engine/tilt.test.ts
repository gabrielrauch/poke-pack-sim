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

it('mola: sai rumo ao alvo, passa um pouco dele e assenta', () => {
  const t = createTilt()
  setTiltTarget(t, 1, -1)
  expect(updateTilt(t)).toBe(true)
  expect(t.x).toBeGreaterThan(0)
  expect(t.y).toBeLessThan(0)
  let peak = 0
  for (let i = 0; i < 600 && updateTilt(t); i++) peak = Math.max(peak, t.x)
  expect(peak).toBeGreaterThan(1)
  expect(peak).toBeLessThan(1.15)
  expect(t).toMatchObject({ x: 1, y: -1, vx: 0, vy: 0 })
  expect(updateTilt(t)).toBe(false)
})

it('mola: frame longo não explode e mais amortecimento não passa do alvo', () => {
  const t = createTilt()
  setTiltTarget(t, 1, 0)
  updateTilt(t, 5000)
  expect(Math.abs(t.x)).toBeLessThan(1)
  const firm = createTilt()
  setTiltTarget(firm, 1, 0)
  let peak = 0
  for (let i = 0; i < 600 && updateTilt(firm, 16, { stiffness: 100, damping: 40 }); i++) {
    peak = Math.max(peak, firm.x)
  }
  expect(peak).toBeLessThanOrEqual(1)
})

it('clampa o alvo', () => {
  const t = createTilt()
  setTiltTarget(t, 5, -5)
  expect(t.tx).toBe(1)
  expect(t.ty).toBe(-1)
})
