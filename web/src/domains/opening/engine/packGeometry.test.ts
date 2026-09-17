import { describe, expect, it } from 'vitest'
import { packGeometry } from './packGeometry'
import { packZ, PUFF, STRIP_FRAC } from './packMath'

describe('packGeometry', () => {
  it('estufa o centro e deixa cantos e costuras planos, com normais recalculadas', () => {
    const g = packGeometry(8, 12)
    const pos = g.getAttribute('position')
    const nor = g.getAttribute('normal')
    expect(pos.count).toBe(9 * 13)
    expect(pos.getZ(6 * 9 + 4)).toBeCloseTo(PUFF)
    expect(pos.getZ(0)).toBe(0)
    expect(pos.getZ(pos.count - 1)).toBe(0)
    expect(nor.count).toBe(pos.count)
    expect(nor.getZ(6 * 9 + 4)).toBeCloseTo(1)
    // ombro esquerdo: a superfície sobe rumo ao centro, a normal aponta para fora (x < 0)
    expect(nor.getX(6 * 9 + 1)).toBeLessThan(0)
  })

  it('a tira cobre só o topo e continua o corpo na fronteira', () => {
    const strip = packGeometry(8, 10, 0, STRIP_FRAC)
    const pos = strip.getAttribute('position')
    expect(pos.getZ(4)).toBe(0)
    expect(pos.getZ(10 * 9 + 4)).toBeCloseTo(packZ(0.5, STRIP_FRAC))
  })
})
