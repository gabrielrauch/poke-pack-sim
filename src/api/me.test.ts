import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app'
import { auth, fixtureProvider, resetDb, seedUser } from '../test/seed'

const now = () => new Date('2026-09-16T12:00:00Z') // 09:00 em São Paulo
const app = () => createApp({ provider: fixtureProvider(), now })

describe('GET /api/me', () => {
  beforeEach(resetDb)

  it('rejects a missing, malformed or unknown token', async () => {
    await seedUser()
    for (const init of [
      {},
      { headers: { Authorization: 'Basic abc' } },
      { headers: { Authorization: 'Bearer' } },
      auth('wrong-token-0123456789abcdef'),
      auth('bad token with spaces'),
    ]) {
      const res = await app().request('/api/me', init, env)
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'UNAUTHORIZED' })
    }
  })

  it('returns the profile with the refill applied and persisted', async () => {
    await seedUser({
      packs_available: 1,
      last_refill_date: '2026-09-16T09:00:00.000Z',
      total_packs: 7,
      packs_since_hit: 2,
      favorites: ['Pikachu'],
    })
    const res = await app().request('/api/me', auth(), env)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      id: 'u1',
      name: 'Ela',
      packs_available: 25,
      next_refill_at: '2026-09-16T15:00:00.000Z',
      total_packs: 7,
      packs_since_hit: 2,
      favorites: ['Pikachu'],
    })
    const again = await app().request('/api/me', auth(), env)
    expect(((await again.json()) as { packs_available: number }).packs_available).toBe(25)
  })

  it('never caches the profile', async () => {
    await seedUser()
    const res = await app().request('/api/me', auth(), env)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })
})
