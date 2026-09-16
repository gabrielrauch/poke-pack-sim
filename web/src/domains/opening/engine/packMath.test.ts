import { describe, expect, it } from 'vitest'
import { MS } from '../../../shared/lib/motion'
import { bodyOutline, guidePhase, stripOutline, sweepPhase, TEETH } from './packMath'

describe('contornos serrilhados (§8.3)', () => {
  it('corpo: 18 dentes entre 18% e 21% no topo e 97% e 100% embaixo', () => {
    const pts = bodyOutline()
    expect(TEETH).toBe(18)
    expect(pts).toHaveLength(38)
    expect(pts[0]).toEqual([0, 0.18])
    expect(pts[1]![1]).toBe(0.21)
    expect(pts[18]).toEqual([1, 0.18])
    expect(pts[19]).toEqual([1, 1])
    expect(pts[37]).toEqual([0, 1])
  })

  it('tira: dentes entre 0 e 12% no topo; inteira embaixo, ou rasgada entre 84% e 100%', () => {
    expect(stripOutline(false)).toHaveLength(21)
    expect(stripOutline(false)[0]).toEqual([0, 0.12])
    expect(stripOutline(false)[19]).toEqual([1, 1])
    expect(stripOutline(true)).toHaveLength(38)
    expect(stripOutline(true)[19]![1]).toBe(1)
    expect(stripOutline(true)[20]![1]).toBe(0.84)
  })
})

describe('ociosos', () => {
  it('varredura para 58% do ciclo, anda até 88% e fica no fim', () => {
    expect(sweepPhase(0)).toBe(0)
    expect(sweepPhase(MS.sweep * 0.58)).toBe(0)
    expect(sweepPhase(MS.sweep * 0.73)).toBeCloseTo(0.5)
    expect(sweepPhase(MS.sweep * 0.9)).toBe(1)
    expect(sweepPhase(MS.sweep + 1)).toBe(0)
  })

  it('guia cruza entre 12% e 88% com fade nas pontas', () => {
    expect(guidePhase(0)).toEqual({ x: 0, opacity: 0 })
    expect(guidePhase(MS.guide * 0.16).opacity).toBeCloseTo(0.5)
    expect(guidePhase(MS.guide * 0.5).x).toBeCloseTo(0.5)
    expect(guidePhase(MS.guide * 0.5).opacity).toBe(1)
    expect(guidePhase(MS.guide * 0.84).opacity).toBeCloseTo(0.5)
    expect(guidePhase(MS.guide * 0.95)).toEqual({ x: 1, opacity: 0 })
  })
})
