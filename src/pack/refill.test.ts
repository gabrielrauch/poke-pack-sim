import { describe, expect, it } from 'vitest'
import { applyRefill } from './refill'

const allowance = { daily: 3, cap: 6 }

describe('applyRefill', () => {
  it('refills on the first day ever', () => {
    expect(
      applyRefill({ packsAvailable: 0, lastRefillDate: null }, '2026-09-16', allowance),
    ).toEqual({
      packsAvailable: 3,
      lastRefillDate: '2026-09-16',
    })
  })

  it('does nothing twice on the same day', () => {
    const state = { packsAvailable: 1, lastRefillDate: '2026-09-16' }
    expect(applyRefill(state, '2026-09-16', allowance)).toBe(state)
  })

  it('refills once per new day and caps the total', () => {
    const state = { packsAvailable: 5, lastRefillDate: '2026-09-15' }
    expect(applyRefill(state, '2026-09-16', allowance)).toEqual({
      packsAvailable: 6,
      lastRefillDate: '2026-09-16',
    })
  })

  it('never refills for a day before the last refill', () => {
    const state = { packsAvailable: 0, lastRefillDate: '2026-09-16' }
    expect(applyRefill(state, '2026-09-15', allowance)).toBe(state)
  })

  it('does not mutate the input', () => {
    const state = { packsAvailable: 0, lastRefillDate: null }
    applyRefill(state, '2026-09-16', allowance)
    expect(state).toEqual({ packsAvailable: 0, lastRefillDate: null })
  })
})
