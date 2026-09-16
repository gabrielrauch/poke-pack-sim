import { expect, it } from 'vitest'
import { BURST_MAX, burstCount, createBurstAttributes, fillBurst } from './burstData'

/** RNG determinístico só para o teste. */
function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

it('contagem por tier (§8.8)', () => {
  expect(burstCount('illustration_rare')).toBe(42)
  expect(burstCount('ultra_rare')).toBe(42)
  expect(burstCount('special_illustration_rare')).toBe(58)
  expect(burstCount('hyper_rare')).toBe(72)
  expect(BURST_MAX).toBe(72)
})

it('preenche só as `count` primeiras; o resto fica invisível (scale 0, dur 1)', () => {
  const a = createBurstAttributes()
  const palette = [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 1],
  ] as const
  fillBurst(a, 42, palette, lcg(7))
  for (let i = 0; i < 42; i++) {
    expect(a.dist[i]).toBeGreaterThanOrEqual(90)
    expect(a.dist[i]).toBeLessThanOrEqual(290)
    expect(a.scale[i]).toBeGreaterThanOrEqual(0.5)
    expect(a.scale[i]).toBeLessThanOrEqual(1.7)
    expect(a.delay[i]).toBeLessThanOrEqual(90)
    expect(a.dur[i]).toBeGreaterThanOrEqual(700)
    expect(a.dur[i]).toBeLessThanOrEqual(1300)
    expect(a.star[i]).toBe(i % 5 === 0 ? 1 : 0)
    expect([a.color[i * 3], a.color[i * 3 + 1], a.color[i * 3 + 2]]).toEqual([...palette[i % 3]!])
  }
  for (let i = 42; i < BURST_MAX; i++) {
    expect(a.scale[i]).toBe(0)
    expect(a.dur[i]).toBe(1)
  }
})
