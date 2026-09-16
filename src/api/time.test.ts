import { describe, expect, it } from 'vitest'
import { localDate, nextLocalMidnight } from './time'

const tz = 'America/Sao_Paulo'

describe('localDate', () => {
  it('formats the calendar day in the given time zone', () => {
    expect(localDate(new Date('2026-09-16T02:30:00Z'), tz)).toBe('2026-09-15')
    expect(localDate(new Date('2026-09-16T03:00:00Z'), tz)).toBe('2026-09-16')
    expect(localDate(new Date('2026-09-16T02:30:00Z'), 'UTC')).toBe('2026-09-16')
  })
})

describe('nextLocalMidnight', () => {
  it('returns the next local 00:00 as a UTC instant', () => {
    expect(nextLocalMidnight(new Date('2026-09-16T02:30:00Z'), tz).toISOString()).toBe(
      '2026-09-16T03:00:00.000Z',
    )
    expect(nextLocalMidnight(new Date('2026-09-16T03:00:00Z'), tz).toISOString()).toBe(
      '2026-09-17T03:00:00.000Z',
    )
    expect(nextLocalMidnight(new Date('2026-12-31T23:59:59Z'), 'UTC').toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    )
  })
})
