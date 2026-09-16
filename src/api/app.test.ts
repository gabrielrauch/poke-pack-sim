import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

describe('GET /api/health', () => {
  it('responds ok with the database reachable', async () => {
    const res = await SELF.fetch('https://pack-sim.test/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, db: true })
  })

  it('returns 404 JSON for unknown API routes', async () => {
    const res = await SELF.fetch('https://pack-sim.test/api/nope')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'NOT_FOUND' })
  })
})
