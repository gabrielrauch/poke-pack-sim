import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { ProviderError } from '../provider/errors'
import { auth, fixtureProvider, jsonBody, resetDb, seedUser } from '../test/seed'
import { createApp } from './app'

type PackResponse = {
  pack_id: string
  set_id: string
  opened_at: string
  cards: {
    n: string
    name: string
    tier: string
    reverse: boolean
    img: string | null
    new: boolean
  }[]
  hit: boolean
  packs_available: number
}

const now = () => new Date('2026-09-16T12:00:00Z')
const app = () => createApp({ provider: fixtureProvider(), now })
const open = (pack_id: string, set_id = 'sv03.5', token?: string) =>
  app().request('/api/packs', jsonBody({ set_id, pack_id }, token), env)

describe('POST /api/packs', () => {
  beforeEach(resetDb)

  it('requires auth and a valid body', async () => {
    await seedUser()
    expect((await app().request('/api/packs', { method: 'POST' }, env)).status).toBe(401)
    for (const body of [
      null,
      {},
      { set_id: 'sv03.5' },
      { pack_id: 'p1' },
      { set_id: 'sv03.5', pack_id: 'has space' },
      { set_id: '../x', pack_id: 'p1' },
    ]) {
      const res = await app().request(
        '/api/packs',
        { ...jsonBody(body), body: body === null ? 'not json' : JSON.stringify(body) },
        env,
      )
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'BAD_REQUEST' })
    }
  })

  it('opens a pack, persists it and decrements the quota', async () => {
    await seedUser({ packs_available: 2, last_refill_date: '2026-09-16T12:00:00.000Z' })
    const res = await open('pack-0001')
    expect(res.status).toBe(200)
    const pack = (await res.json()) as PackResponse
    expect(pack.pack_id).toBe('pack-0001')
    expect(pack.set_id).toBe('sv03.5')
    expect(pack.opened_at).toBe('2026-09-16T12:00:00.000Z')
    expect(pack.cards).toHaveLength(5)
    expect(pack.cards.map((c) => c.reverse)).toEqual([false, false, false, true, false])
    expect(pack.cards.every((c) => c.new)).toBe(true)
    expect(pack.packs_available).toBe(1)

    const user = await env.DB.prepare(
      'SELECT packs_available, total_packs, packs_since_hit FROM users WHERE id = ?',
    )
      .bind('u1')
      .first<{ packs_available: number; total_packs: number; packs_since_hit: number }>()
    expect(user).toEqual({ packs_available: 1, total_packs: 1, packs_since_hit: pack.hit ? 0 : 1 })

    const stored = await env.DB.prepare('SELECT * FROM packs WHERE id = ?')
      .bind('pack-0001')
      .first<{
        user_id: string
        set_id: string
        opened_at: string
        cards: string
        hit: number
      }>()
    expect(stored?.user_id).toBe('u1')
    expect(JSON.parse(stored!.cards)).toEqual(pack.cards)
    expect(stored?.hit).toBe(pack.hit ? 1 : 0)

    const owned = await env.DB.prepare(
      'SELECT card_n, count_normal, count_reverse, first_pulled_at FROM owned WHERE user_id = ? ORDER BY card_n',
    )
      .bind('u1')
      .all<{
        card_n: string
        count_normal: number
        count_reverse: number
        first_pulled_at: string
      }>()
    expect(owned.results).toHaveLength(5)
    for (const row of owned.results) {
      const card = pack.cards.find((c) => c.n === row.card_n)!
      expect(row.count_normal).toBe(card.reverse ? 0 : 1)
      expect(row.count_reverse).toBe(card.reverse ? 1 : 0)
      expect(row.first_pulled_at).toBe('2026-09-16T12:00:00.000Z')
    }
  })

  it('is idempotent by pack_id: same result, no second charge', async () => {
    await seedUser({ packs_available: 2, last_refill_date: '2026-09-16T12:00:00.000Z' })
    const first = (await (await open('pack-0002')).json()) as PackResponse
    const second = (await (await open('pack-0002')).json()) as PackResponse
    expect(second).toEqual(first)
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM packs').first<{ n: number }>()
    expect(count?.n).toBe(1)
  })

  it('is deterministic by pack_id across users and marks repeats as not new', async () => {
    await seedUser({ packs_available: 6, last_refill_date: '2026-09-16T12:00:00.000Z' })
    const a = (await (await open('pack-0003')).json()) as PackResponse
    const b = (await (await open('pack-0004')).json()) as PackResponse
    expect(a.cards.map((c) => c.n)).not.toEqual(b.cards.map((c) => c.n))
    const repeated = b.cards.filter((cb) => a.cards.some((ca) => ca.n === cb.n))
    for (const c of repeated) expect(c.new).toBe(false)
    for (const c of b.cards.filter((cb) => !a.cards.some((ca) => ca.n === cb.n)))
      expect(c.new).toBe(true)
  })

  it('rejects the same pack_id with another set', async () => {
    await seedUser({ packs_available: 2, last_refill_date: '2026-09-16T12:00:00.000Z' })
    await open('pack-0005')
    const res = await open('pack-0005', 'sv01')
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'PACK_MISMATCH' })
  })

  it('refuses without quota and tells when it refills', async () => {
    await seedUser({ packs_available: 0, last_refill_date: '2026-09-16T12:00:00.000Z' })
    const res = await open('pack-0006')
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: 'NO_PACKS',
      next_refill_at: '2026-09-16T15:00:00.000Z',
    })
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM packs').first<{ n: number }>()
    expect(count?.n).toBe(0)
  })

  it('refills lazily before charging', async () => {
    await seedUser({ packs_available: 0, last_refill_date: '2026-09-16T09:00:00.000Z' })
    const res = await open('pack-0007')
    expect(res.status).toBe(200)
    expect(((await res.json()) as PackResponse).packs_available).toBe(24)
  })

  it('returns 404 for an unknown set or a series without recipe', async () => {
    await seedUser({ packs_available: 2, last_refill_date: '2026-09-16T12:00:00.000Z' })
    expect((await open('pack-0008', 'zz9')).status).toBe(404)
    expect((await open('pack-0009', 'swsh12')).status).toBe(404)
  })

  it('maps provider failures to 503 without charging', async () => {
    await seedUser({ packs_available: 2, last_refill_date: '2026-09-16T12:00:00.000Z' })
    const failing = createApp({
      provider: {
        getSet: async () => {
          throw new ProviderError('UPSTREAM', 'down')
        },
      },
      now,
    })
    const res = await failing.request(
      '/api/packs',
      jsonBody({ set_id: 'sv03.5', pack_id: 'pack-0010' }),
      env,
    )
    expect(res.status).toBe(503)
    const user = await env.DB.prepare('SELECT packs_available FROM users WHERE id = ?')
      .bind('u1')
      .first<{ packs_available: number }>()
    expect(user?.packs_available).toBe(2)
  })

  it('increments packs_since_hit relative to the stored value', async () => {
    await seedUser({
      packs_available: 6,
      last_refill_date: '2026-09-16T12:00:00.000Z',
      packs_since_hit: 2,
    })
    const a = (await (await open('pack-0012')).json()) as PackResponse
    // Simula outra abertura que já incrementou o contador no meio do caminho.
    await env.DB.prepare('UPDATE users SET packs_since_hit = packs_since_hit + 1 WHERE id = ?')
      .bind('u1')
      .run()
    const after = await env.DB.prepare('SELECT packs_since_hit FROM users WHERE id = ?')
      .bind('u1')
      .first<{ packs_since_hit: number }>()
    expect(after?.packs_since_hit).toBe(a.hit ? 1 : 4)
  })

  it('applies pity from the stored counter', async () => {
    await seedUser({
      packs_available: 2,
      last_refill_date: '2026-09-16T12:00:00.000Z',
      packs_since_hit: 6,
    })
    const pack = (await (await open('pack-0011')).json()) as PackResponse
    expect(pack.hit).toBe(true)
    const user = await env.DB.prepare('SELECT packs_since_hit FROM users WHERE id = ?')
      .bind('u1')
      .first<{ packs_since_hit: number }>()
    expect(user?.packs_since_hit).toBe(0)
  })
})
