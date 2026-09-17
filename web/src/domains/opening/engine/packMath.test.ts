import { describe, expect, it } from 'vitest'
import { MS } from '../../../shared/lib/motion'
import {
  bodyOutline,
  guidePhase,
  mulberry32,
  packZ,
  PUFF,
  SEAL_BOTTOM,
  SEAL_DEPTH,
  SEAL_TEETH,
  SEAL_TOP,
  STRIP_FRAC,
  stripOutline,
  sweepPhase,
  TEAR_TEETH,
} from './packMath'

describe('contornos serrilhados (§8.3)', () => {
  it('corpo: boca rasgada com 18 dentes entre 18% e 21%; costura fina com 60 dentes embaixo', () => {
    const pts = bodyOutline()
    expect(pts).toHaveLength(TEAR_TEETH + 1 + SEAL_TEETH + 1)
    expect(pts[0]).toEqual([0, 0.18])
    expect(pts[1]![1]).toBe(0.21)
    expect(pts[TEAR_TEETH]).toEqual([1, 0.18])
    expect(pts[TEAR_TEETH + 1]).toEqual([1, 1])
    expect(pts[TEAR_TEETH + 2]![1]).toBeCloseTo(1 - SEAL_DEPTH)
    expect(pts[pts.length - 1]).toEqual([0, 1])
  })

  it('tira: costura fina no topo; inteira embaixo, ou rasgada com 18 dentes entre 84% e 100%', () => {
    const intact = stripOutline(false)
    expect(intact).toHaveLength(SEAL_TEETH + 3)
    expect(intact[0]).toEqual([0, SEAL_DEPTH / STRIP_FRAC])
    expect(intact[1]).toEqual([1 / SEAL_TEETH, 0])
    expect(intact[SEAL_TEETH + 1]).toEqual([1, 1])
    const torn = stripOutline(true)
    expect(torn).toHaveLength(SEAL_TEETH + 1 + TEAR_TEETH + 1)
    expect(torn[SEAL_TEETH + 1]![1]).toBe(1)
    expect(torn[SEAL_TEETH + 2]![1]).toBe(0.84)
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

describe('volume do pacote', () => {
  it('é zero nas costuras e nas laterais, máximo no centro', () => {
    expect(packZ(0.5, 0)).toBe(0)
    expect(packZ(0.5, SEAL_TOP)).toBe(0)
    expect(packZ(0.5, SEAL_BOTTOM)).toBe(0)
    expect(packZ(0.5, 1)).toBe(0)
    expect(packZ(0, 0.5)).toBe(0)
    expect(packZ(1, 0.5)).toBe(0)
    expect(packZ(0.5, 0.5)).toBeCloseTo(PUFF)
  })

  it('é simétrico e cresce rumo ao centro', () => {
    expect(packZ(0.2, 0.5)).toBeCloseTo(packZ(0.8, 0.5))
    expect(packZ(0.5, 0.3)).toBeCloseTo(packZ(0.5, 0.7))
    expect(packZ(0.2, 0.5)).toBeLessThan(packZ(0.35, 0.5))
    expect(packZ(0.35, 0.5)).toBeLessThan(packZ(0.5, 0.5))
  })
})

describe('mulberry32', () => {
  it('é determinístico por seed e fica em [0, 1)', () => {
    const a = mulberry32(151)
    const b = mulberry32(151)
    const xs = Array.from({ length: 5 }, () => a())
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()))
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
    expect(mulberry32(152)()).not.toBe(xs[0])
  })
})
