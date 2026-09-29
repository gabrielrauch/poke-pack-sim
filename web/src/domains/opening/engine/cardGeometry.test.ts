import { expect, it } from 'vitest'
import { cardEdgeGeometry, roundedOutline } from './cardGeometry'

it('contorno: toca as quatro bordas e fica a um raio do centro de cada canto', () => {
  const ring = roundedOutline(1.4, 0.05, 4)
  expect(ring).toHaveLength(20)
  const xs = ring.map((p) => p.x)
  const ys = ring.map((p) => p.y)
  expect(Math.max(...xs)).toBeCloseTo(0.5)
  expect(Math.min(...xs)).toBeCloseTo(-0.5)
  expect(Math.max(...ys)).toBeCloseTo(0.7)
  expect(Math.min(...ys)).toBeCloseTo(-0.7)
  for (const p of ring) {
    expect(Math.hypot(p.nx, p.ny)).toBeCloseTo(1)
    // A normal aponta para fora: mesmo sinal da posição no eixo dominante.
    expect(p.x * p.nx + p.y * p.ny).toBeGreaterThan(0)
  }
})

it('borda: duas camadas em z = ±0,5 e triângulos virados para fora', () => {
  const g = cardEdgeGeometry(1.4, 0.05, 4)
  const pos = g.getAttribute('position')
  const nor = g.getAttribute('normal')
  expect(pos.count).toBe(40)
  expect(new Set(Array.from({ length: pos.count }, (_, i) => pos.getZ(i)))).toEqual(
    new Set([0.5, -0.5]),
  )
  const index = g.getIndex()!
  expect(index.count).toBe(20 * 6)
  for (let t = 0; t < index.count; t += 3) {
    const [a, b, c] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)]
    const ab = [pos.getX(b) - pos.getX(a), pos.getY(b) - pos.getY(a), pos.getZ(b) - pos.getZ(a)]
    const ac = [pos.getX(c) - pos.getX(a), pos.getY(c) - pos.getY(a), pos.getZ(c) - pos.getZ(a)]
    const cross = [
      ab[1]! * ac[2]! - ab[2]! * ac[1]!,
      ab[2]! * ac[0]! - ab[0]! * ac[2]!,
      ab[0]! * ac[1]! - ab[1]! * ac[0]!,
    ]
    // Sentido anti-horário visto de fora: a normal da face concorda com a do vértice.
    const dot = cross[0]! * nor.getX(a) + cross[1]! * nor.getY(a) + cross[2]! * nor.getZ(a)
    if (Math.hypot(...cross) > 1e-9) expect(dot).toBeGreaterThan(0)
  }
})
