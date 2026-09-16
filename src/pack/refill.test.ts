import { describe, expect, it } from 'vitest'
import { applyRefill } from './refill'

const allowance = { amount: 3, hours: 3, cap: 6 }
const p1 = '2026-09-16T12:00:00.000Z'
const p2 = '2026-09-16T15:00:00.000Z'

describe('applyRefill', () => {
  it('refills on the first period ever', () => {
    expect(applyRefill({ packsAvailable: 0, lastRefillDate: null }, p1, allowance)).toEqual({
      packsAvailable: 3,
      lastRefillDate: p1,
    })
  })

  it('does nothing twice in the same period', () => {
    const state = { packsAvailable: 1, lastRefillDate: p1 }
    expect(applyRefill(state, p1, allowance)).toBe(state)
  })

  it('refills once per new period and caps the total', () => {
    const state = { packsAvailable: 5, lastRefillDate: p1 }
    expect(applyRefill(state, p2, allowance)).toEqual({ packsAvailable: 6, lastRefillDate: p2 })
  })

  it('never refills for a period before the last refill', () => {
    const state = { packsAvailable: 0, lastRefillDate: p2 }
    expect(applyRefill(state, p1, allowance)).toBe(state)
  })

  it('does not mutate the input', () => {
    const state = { packsAvailable: 0, lastRefillDate: null }
    applyRefill(state, p1, allowance)
    expect(state).toEqual({ packsAvailable: 0, lastRefillDate: null })
  })
})
