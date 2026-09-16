import { describe, expect, it, vi } from 'vitest'
import { EASE } from '../../../shared/lib/motion'
import { cubicBezier, Tweens } from './tween'

describe('cubicBezier', () => {
  it('linear é identidade e satura fora de [0, 1]', () => {
    const f = cubicBezier(EASE.linear)
    expect(f(0.3)).toBe(0.3)
    expect(f(-1)).toBe(0)
    expect(f(2)).toBe(1)
  })

  it('bate com o ease-in do CSS', () => {
    expect(cubicBezier(EASE.easeIn)(0.5)).toBeCloseTo(0.3154, 3)
  })

  it('mola passa de 1 no meio e termina exatamente em 1', () => {
    const f = cubicBezier(EASE.settle)
    expect(f(0.5)).toBeGreaterThan(1)
    expect(f(0)).toBe(0)
    expect(f(1)).toBe(1)
  })

  it('flip e queda do corpo', () => {
    expect(cubicBezier(EASE.flip)(0.5)).toBeCloseTo(0.891, 2)
    expect(cubicBezier(EASE.bodyFall)(0.5)).toBeCloseTo(0.153, 2)
  })
})

describe('Tweens', () => {
  it('interpola do valor atual até o alvo e conclui uma vez', () => {
    const t = new Tweens()
    const o = { x: 0 }
    const done = vi.fn()
    t.to(o, { x: 10 }, { duration: 100, onComplete: done })
    t.update(1000)
    expect(o.x).toBe(0)
    expect(t.active).toBe(1)
    t.update(1050)
    expect(o.x).toBeCloseTo(5)
    t.update(1100)
    expect(o.x).toBe(10)
    expect(done).toHaveBeenCalledTimes(1)
    expect(t.active).toBe(0)
    t.update(1200)
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('respeita delay e captura o "from" só quando começa', () => {
    const t = new Tweens()
    const o = { x: 0 }
    t.to(o, { x: 10 }, { duration: 100, delay: 50 })
    t.update(0)
    o.x = 4
    t.update(40)
    expect(o.x).toBe(4)
    t.update(100)
    expect(o.x).toBeCloseTo(7)
  })

  it('keyframes interpolam linearmente entre quadros', () => {
    const t = new Tweens()
    const o = { y: 0 }
    t.keyframes(
      o,
      [
        { at: 0, to: { y: 0 } },
        { at: 0.45, to: { y: 34 } },
        { at: 0.8, to: { y: 10 } },
        { at: 1, to: { y: 0 } },
      ],
      { duration: 1000 },
    )
    t.update(0)
    t.update(450)
    expect(o.y).toBeCloseTo(34)
    t.update(625)
    expect(o.y).toBeCloseTo(22)
    t.update(1000)
    expect(o.y).toBe(0)
    expect(t.active).toBe(0)
  })

  it('keyframes exigem at: 0 no primeiro quadro, ordem crescente e as mesmas propriedades', () => {
    const t = new Tweens()
    const o = { y: 0, x: 0 }
    expect(() =>
      t.keyframes(
        o,
        [
          { at: 0.1, to: { y: 0 } },
          { at: 1, to: { y: 1 } },
        ],
        { duration: 1 },
      ),
    ).toThrow()
    expect(() =>
      t.keyframes(
        o,
        [
          { at: 0, to: { y: 0 } },
          { at: 0.5, to: { y: 1 } },
          { at: 0.5, to: { y: 2 } },
        ],
        {
          duration: 1,
        },
      ),
    ).toThrow()
    expect(() =>
      t.keyframes(
        o,
        [
          { at: 0, to: { y: 0 } },
          { at: 1, to: { x: 1 } },
        ],
        { duration: 1 },
      ),
    ).toThrow()
  })

  it('mola extrapola além do alvo no meio do caminho', () => {
    const t = new Tweens()
    const o = { x: 0 }
    t.to(o, { x: 10 }, { duration: 100, easing: EASE.settle })
    t.update(0)
    t.update(50)
    expect(o.x).toBeGreaterThan(10)
    t.update(100)
    expect(o.x).toBe(10)
  })

  it('timeScale 0,5 termina na metade do tempo', () => {
    const t = new Tweens()
    t.timeScale = 0.5
    const o = { x: 0 }
    t.to(o, { x: 10 }, { duration: 100 })
    t.update(0)
    t.update(50)
    expect(o.x).toBe(10)
    expect(t.active).toBe(0)
  })

  it('after dispara uma vez no instante', () => {
    const t = new Tweens()
    const fn = vi.fn()
    t.after(30, fn)
    t.update(0)
    t.update(20)
    expect(fn).not.toHaveBeenCalled()
    t.update(30)
    expect(fn).toHaveBeenCalledTimes(1)
    t.update(60)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('onComplete pode agendar o próximo tween', () => {
    const t = new Tweens()
    const o = { x: 0, y: 0 }
    t.to(o, { x: 1 }, { duration: 10, onComplete: () => t.to(o, { y: 1 }, { duration: 10 }) })
    t.update(0)
    t.update(10)
    expect(o.x).toBe(1)
    t.update(20)
    expect(o.y).toBe(1)
  })

  it('cancel e cancelAll param sem concluir', () => {
    const t = new Tweens()
    const o = { x: 0 }
    const done = vi.fn()
    const tw = t.to(o, { x: 10 }, { duration: 100, onComplete: done })
    t.update(0)
    tw.cancel()
    expect(tw.done).toBe(true)
    t.update(100)
    expect(o.x).toBe(0)
    expect(done).not.toHaveBeenCalled()
    t.to(o, { x: 10 }, { duration: 100 })
    t.cancelAll()
    expect(t.active).toBe(0)
  })
})
