import { describe, expect, it } from 'vitest'
import { nextRefillAt, refillPeriod } from './time'

describe('refillPeriod', () => {
  it('is the start of the window that contains the instant', () => {
    expect(refillPeriod(new Date('2026-09-16T12:00:00Z'), 3)).toBe('2026-09-16T12:00:00.000Z')
    expect(refillPeriod(new Date('2026-09-16T14:59:59Z'), 3)).toBe('2026-09-16T12:00:00.000Z')
    expect(refillPeriod(new Date('2026-09-16T15:00:00Z'), 3)).toBe('2026-09-16T15:00:00.000Z')
    expect(refillPeriod(new Date('2026-09-16T02:30:00Z'), 24)).toBe('2026-09-16T00:00:00.000Z')
  })
})

describe('nextRefillAt', () => {
  it('is the start of the following window', () => {
    expect(nextRefillAt(new Date('2026-09-16T12:00:00Z'), 3).toISOString()).toBe(
      '2026-09-16T15:00:00.000Z',
    )
    expect(nextRefillAt(new Date('2026-09-16T14:59:59Z'), 3).toISOString()).toBe(
      '2026-09-16T15:00:00.000Z',
    )
    expect(nextRefillAt(new Date('2026-12-31T23:59:59Z'), 24).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    )
  })
})
