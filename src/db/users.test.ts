import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { favoritesOf, findUserByTokenHash, persistRefill } from './users'
import { seedUser } from '../test/seed'
import { hashToken } from '../api/auth'

const allowance = { daily: 3, cap: 6 }

describe('users', () => {
  it('finds a user by token hash', async () => {
    const seeded = await seedUser({ token: 'abcdefghijklmnopqrstuvwxyz012345' })
    const user = await findUserByTokenHash(
      env.DB,
      await hashToken('abcdefghijklmnopqrstuvwxyz012345'),
    )
    expect(user?.id).toBe(seeded.id)
    expect(await findUserByTokenHash(env.DB, await hashToken('nope-nope-nope-nope'))).toBeNull()
  })

  it('parses favorites defensively', () => {
    const base = { favorites: '["Pikachu"]' }
    expect(favoritesOf(base)).toEqual(['Pikachu'])
    expect(favoritesOf({ favorites: 'garbage' })).toEqual([])
    expect(favoritesOf({ favorites: '{"a":1}' })).toEqual([])
    expect(favoritesOf({ favorites: '[1, "Eevee"]' })).toEqual(['Eevee'])
  })

  it('persists a refill only when the day changed', async () => {
    await seedUser({ packs_available: 1, last_refill_date: '2026-09-15' })
    const user = (await findUserByTokenHash(
      env.DB,
      await hashToken('test-token-0123456789abcdef'),
    ))!
    const same = await persistRefill(env.DB, user, '2026-09-15', allowance)
    expect(same).toBe(user)

    const refilled = await persistRefill(env.DB, user, '2026-09-16', allowance)
    expect(refilled.packs_available).toBe(4)
    expect(refilled.last_refill_date).toBe('2026-09-16')
    const stored = await env.DB.prepare(
      'SELECT packs_available, last_refill_date FROM users WHERE id = ?',
    )
      .bind(user.id)
      .first<{ packs_available: number; last_refill_date: string }>()
    expect(stored).toEqual({ packs_available: 4, last_refill_date: '2026-09-16' })
  })
})
