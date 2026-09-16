import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { auth, fixtureProvider, resetDb, seedUser } from '../test/seed'
import { createApp } from './app'

const app = () => createApp({ provider: fixtureProvider() })

type History = {
  packs: { pack_id: string; set_id: string; opened_at: string; hit: boolean; cards: unknown[] }[]
  next_before: string | null
}

async function insertPack(id: string, openedAt: string, hit = 0) {
  await env.DB.prepare(
    'INSERT INTO packs (id, user_id, set_id, opened_at, cards, hit) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(id, 'u1', 'sv03.5', openedAt, JSON.stringify([{ n: '001' }]), hit)
    .run()
}

describe('GET /api/packs', () => {
  beforeEach(resetDb)

  it('requires auth', async () => {
    await seedUser()
    expect((await app().request('/api/packs', {}, env)).status).toBe(401)
  })

  it('lists newest first with a cursor', async () => {
    await seedUser()
    for (let i = 1; i <= 5; i++)
      await insertPack(`p${i}`, `2026-09-1${i}T12:00:00.000Z`, i === 3 ? 1 : 0)
    await env.DB.prepare(
      "INSERT INTO packs (id, user_id, set_id, opened_at, cards, hit) VALUES ('other', 'u2', 'sv03.5', '2026-09-19T00:00:00.000Z', '[]', 0)",
    ).run()

    const first = (await (await app().request('/api/packs?limit=2', auth(), env)).json()) as History
    expect(first.packs.map((p) => p.pack_id)).toEqual(['p5', 'p4'])
    expect(first.packs[0]).toMatchObject({ set_id: 'sv03.5', hit: false, cards: [{ n: '001' }] })
    expect(first.next_before).toBe('2026-09-14T12:00:00.000Z|p4')

    const second = (await (
      await app().request(`/api/packs?limit=2&before=${first.next_before}`, auth(), env)
    ).json()) as History
    expect(second.packs.map((p) => p.pack_id)).toEqual(['p3', 'p2'])
    expect(second.packs[0]?.hit).toBe(true)

    const last = (await (
      await app().request(`/api/packs?limit=2&before=${second.next_before}`, auth(), env)
    ).json()) as History
    expect(last.packs.map((p) => p.pack_id)).toEqual(['p1'])
    expect(last.next_before).toBeNull()
  })

  it('does not skip packs that share the same opened_at', async () => {
    await seedUser()
    for (const id of ['a', 'b', 'c']) await insertPack(id, '2026-09-16T12:00:00.000Z')
    const first = (await (await app().request('/api/packs?limit=2', auth(), env)).json()) as History
    expect(first.packs.map((p) => p.pack_id)).toEqual(['c', 'b'])
    const rest = (await (
      await app().request(`/api/packs?limit=2&before=${first.next_before}`, auth(), env)
    ).json()) as History
    expect(rest.packs.map((p) => p.pack_id)).toEqual(['a'])
  })

  it('normalizes a non-ISO cursor before comparing', async () => {
    await seedUser()
    await insertPack('old', '2026-01-01T00:00:00.000Z')
    await insertPack('new', '2026-09-16T12:00:00.000Z')
    const res = (await (
      await app().request('/api/packs?before=2026/06/01', auth(), env)
    ).json()) as History
    expect(res.packs.map((p) => p.pack_id)).toEqual(['old'])
  })

  it('clamps limit and ignores a malformed cursor', async () => {
    await seedUser()
    await insertPack('p1', '2026-09-16T12:00:00.000Z')
    const res = await app().request('/api/packs?limit=999&before=yesterday', auth(), env)
    expect(res.status).toBe(200)
    expect(((await res.json()) as History).packs).toHaveLength(1)
    expect((await app().request('/api/packs?limit=0', auth(), env)).status).toBe(200)
  })
})
