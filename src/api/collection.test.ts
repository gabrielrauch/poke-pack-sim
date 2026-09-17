import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { auth, fixtureProvider, resetDb, seedUser } from '../test/seed'
import { createApp } from './app'

const app = () => createApp({ provider: fixtureProvider() })

describe('GET /api/collection/:set', () => {
  beforeEach(resetDb)

  it('requires auth', async () => {
    await seedUser()
    expect((await app().request('/api/collection/sv03.5', {}, env)).status).toBe(401)
  })

  it('returns counts keyed by card number, only for that set', async () => {
    await seedUser()
    const rows = [
      ['sv03.5', '025', 2, 1],
      ['sv03.5', '001', 0, 1],
      ['sv01', '001', 5, 0],
    ] as const
    for (const [set, n, normal, reverse] of rows) {
      await env.DB.prepare(
        'INSERT INTO owned (user_id, set_id, card_n, count_normal, count_reverse, first_pulled_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind('u1', set, n, normal, reverse, '2026-09-16T12:00:00.000Z')
        .run()
    }
    const res = await app().request('/api/collection/sv03.5', auth(), env)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(await res.json()).toEqual({
      '025': { normal: 2, reverse: 1, first: '2026-09-16T12:00:00.000Z' },
      '001': { normal: 0, reverse: 1, first: '2026-09-16T12:00:00.000Z' },
    })
  })

  it('is empty for a set never opened and 404 for a malformed id', async () => {
    await seedUser()
    expect(await (await app().request('/api/collection/sv01', auth(), env)).json()).toEqual({})
    expect((await app().request('/api/collection/..%2Fx', auth(), env)).status).toBe(404)
  })
})
