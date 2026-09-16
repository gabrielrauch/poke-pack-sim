import { describe, expect, it } from 'vitest'
import { createRng, pickWeighted, seedFromBytes, type Rng } from './rng'

describe('createRng (xoshiro128**)', () => {
  it('matches the reference sequence for seed [1, 2, 3, 4]', () => {
    const rng = createRng([1, 2, 3, 4])
    expect([rng.nextU32(), rng.nextU32(), rng.nextU32(), rng.nextU32()]).toEqual([
      11520, 0, 5927040, 70819200,
    ])
  })

  it('is deterministic per seed and differs across seeds', () => {
    const a = createRng([7, 8, 9, 10])
    const b = createRng([7, 8, 9, 10])
    const c = createRng([7, 8, 9, 11])
    const seq = (rng: Rng) => Array.from({ length: 8 }, () => rng.nextU32())
    expect(seq(a)).toEqual(seq(b))
    expect(seq(createRng([7, 8, 9, 10]))).not.toEqual(seq(c))
  })

  it('treats an all-zero seed as [1, 0, 0, 0]', () => {
    const zero = createRng([0, 0, 0, 0])
    const one = createRng([1, 0, 0, 0])
    const draws = Array.from({ length: 8 }, () => zero.nextU32())
    expect(draws).toEqual(Array.from({ length: 8 }, () => one.nextU32()))
    expect(draws.some((n) => n !== 0)).toBe(true)
  })

  it('nextFloat is uniform in [0, 1)', () => {
    const rng = createRng([42, 43, 44, 45])
    let sum = 0
    for (let i = 0; i < 10_000; i++) {
      const f = rng.nextFloat()
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThan(1)
      sum += f
    }
    expect(sum / 10_000).toBeCloseTo(0.5, 1)
  })
})

describe('seedFromBytes', () => {
  it('reads four big-endian uint32 from the first 16 bytes', () => {
    const bytes = new Uint8Array(32)
    bytes.set([0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3, 0xff, 0xff, 0xff, 0xff, 9, 9, 9, 9])
    expect(seedFromBytes(bytes)).toEqual([1, 2, 3, 4294967295])
  })

  it('respects the byte offset of a subarray', () => {
    const bytes = new Uint8Array(20)
    bytes.set([0, 0, 0, 5], 4)
    expect(seedFromBytes(bytes.subarray(4))[0]).toBe(5)
  })

  it('rejects fewer than 16 bytes', () => {
    expect(() => seedFromBytes(new Uint8Array(15))).toThrow(RangeError)
  })
})

describe('pickWeighted', () => {
  const rngAt = (value: number): Rng => ({ nextU32: () => 0, nextFloat: () => value })
  const entries = [
    ['a', 1],
    ['b', 3],
  ] as const

  it('selects by cumulative weight', () => {
    expect(pickWeighted(rngAt(0), entries)).toBe('a')
    expect(pickWeighted(rngAt(0.249), entries)).toBe('a')
    expect(pickWeighted(rngAt(0.25), entries)).toBe('b')
    expect(pickWeighted(rngAt(0.999), entries)).toBe('b')
  })

  it('returns the only entry without consuming randomness', () => {
    let calls = 0
    const rng: Rng = { nextU32: () => 0, nextFloat: () => (calls++, 0.5) }
    expect(pickWeighted(rng, [['only', 2]])).toBe('only')
    expect(calls).toBe(0)
  })

  it('rejects empty or non-positive weights', () => {
    expect(() => pickWeighted(rngAt(0), [])).toThrow(RangeError)
    expect(() => pickWeighted(rngAt(0), [['a', 0]])).toThrow(RangeError)
    expect(() =>
      pickWeighted(rngAt(0), [
        ['a', 2],
        ['b', -1],
      ]),
    ).toThrow(RangeError)
    expect(() => pickWeighted(rngAt(0), [['a', Number.NaN]])).toThrow(RangeError)
    expect(() =>
      pickWeighted(rngAt(0), [
        ['a', 1],
        ['b', Number.POSITIVE_INFINITY],
      ]),
    ).toThrow(RangeError)
  })

  it('rejects weights whose sum overflows to Infinity', () => {
    const huge = [
      ['a', Number.MAX_VALUE],
      ['b', Number.MAX_VALUE],
    ] as const
    expect(() => pickWeighted(rngAt(0.999), huge)).toThrow(RangeError)
  })

  it('draws proportionally over many samples', () => {
    const rng = createRng([1, 1, 2, 3])
    let b = 0
    for (let i = 0; i < 10_000; i++) if (pickWeighted(rng, entries) === 'b') b++
    expect(b / 10_000).toBeCloseTo(0.75, 1)
  })
})
