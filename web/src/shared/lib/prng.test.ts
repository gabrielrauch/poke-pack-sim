import { describe, expect, it } from 'vitest'
import { mulberry32 } from './prng'

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
