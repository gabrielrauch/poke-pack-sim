import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { fixtureProvider, resetDb, seedUser, TEST_TOKEN } from '../test/seed'
import { createApp } from './app'

const app = () => createApp({ provider: fixtureProvider() })

describe('GET /manifest.webmanifest', () => {
  beforeEach(resetDb)

  it('returns a per-token manifest whose start_url carries the token', async () => {
    await seedUser()
    const res = await app().request(`/manifest.webmanifest?t=${TEST_TOKEN}`, {}, env)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/manifest+json')
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    const manifest = (await res.json()) as Record<string, unknown>
    expect(manifest.id).toBe('/')
    expect(manifest.start_url).toBe(`/?t=${TEST_TOKEN}`)
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons).toEqual([
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ])
  })

  it('rejects an unknown token', async () => {
    await seedUser()
    const res = await app().request('/manifest.webmanifest?t=wrong-token-0123456789abcdef', {}, env)
    expect(res.status).toBe(401)
  })

  it('without a token falls through to the static asset', async () => {
    await seedUser()
    const res = await app().request('/manifest.webmanifest', {}, env)
    expect(res.status).not.toBe(401)
  })
})
