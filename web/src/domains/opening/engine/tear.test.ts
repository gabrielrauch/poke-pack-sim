import { describe, expect, it } from 'vitest'
import { inTearZone, onPack, tearBegin, tearMove, tearRelease } from './tear'

const rect = { left: 100, top: 200, width: 250, height: 405 }

describe('zonas', () => {
  it('tira = 24% superiores do pacote com 14px de folga', () => {
    expect(inTearZone(rect, 200, 200 + 405 * 0.24 + 14)).toBe(true)
    expect(inTearZone(rect, 200, 200 + 405 * 0.24 + 15)).toBe(false)
    expect(inTearZone(rect, 86, 190)).toBe(true)
    expect(inTearZone(rect, 85, 190)).toBe(false)
    expect(onPack(rect, 200, 500)).toBe(true)
    expect(onPack(rect, 400, 500)).toBe(false)
  })
})

describe('gesto', () => {
  it('começa parado no ponto tocado', () => {
    expect(tearBegin(0.3)).toEqual({ active: true, p: 0, dir: 0, a: 0.3, b: 0.3 })
  })

  it('define a direção depois de 4px e estende só o extremo daquele lado', () => {
    let t = tearBegin(0.3)
    expect(tearMove(t, 0.31, 3, 250).tear.dir).toBe(0)
    t = tearMove(t, 0.34, 10, 250).tear
    expect(t.dir).toBe(1)
    expect(t.b).toBeCloseTo(0.34)
    expect(t.a).toBeCloseTo(0.3)
    t = tearMove(t, 0.2, 10, 250).tear
    expect(t.b).toBeCloseTo(0.34)
    const left = tearMove(tearBegin(0.6), 0.5, -25, 250).tear
    expect(left.dir).toBe(-1)
    expect(left.a).toBeCloseTo(0.5)
  })

  it('progresso |dx|/largura*1.15, monotônico, com marco a cada 10%', () => {
    let r = tearMove(tearBegin(0.1), 0.2, 25, 250)
    expect(r.tear.p).toBeCloseTo(0.115)
    expect(r.milestone).toBe(true)
    r = tearMove(r.tear, 0.15, 10, 250)
    expect(r.tear.p).toBeCloseTo(0.115)
    expect(r.milestone).toBe(false)
    r = tearMove(r.tear, 0.3, 50, 250)
    expect(r.tear.p).toBeCloseTo(0.23)
    expect(r.milestone).toBe(true)
  })

  it('completa a 98% durante o arraste e vira inativo', () => {
    const r = tearMove(tearBegin(0.05), 0.95, 220, 250)
    expect(r.complete).toBe(true)
    expect(r.tear.active).toBe(false)
    expect(r.tear.p).toBe(1)
  })

  it('ao soltar: 70% completa, abaixo reseta', () => {
    expect(tearRelease(tearMove(tearBegin(0), 0.7, 160, 250).tear)).toBe('complete')
    expect(tearRelease(tearMove(tearBegin(0), 0.4, 100, 250).tear)).toBe('reset')
  })
})
