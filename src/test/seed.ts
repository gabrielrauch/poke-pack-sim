import { env } from 'cloudflare:test'
import { hashToken } from '../api/auth'
import { buildCatalog, type CatalogData } from '../provider/catalog'
import enFixture from '../provider/fixtures/sv03.5.en.json'
import ptFixture from '../provider/fixtures/sv03.5.pt.json'
import type { CardProvider } from '../provider/types'

export const TEST_TOKEN = 'test-token-0123456789abcdef'

export type SeedUser = {
  id: string
  name: string
  token: string
  packs_available: number
  last_refill_date: string | null
  packs_since_hit: number
  total_packs: number
  favorites: string[]
}

/** Insere uma usuária direto no D1 (storage isolado por teste: chame em cada teste). */
export async function seedUser(overrides: Partial<SeedUser> = {}): Promise<SeedUser> {
  const user: SeedUser = {
    id: crypto.randomUUID(),
    name: 'Ela',
    token: TEST_TOKEN,
    packs_available: 3,
    last_refill_date: null,
    packs_since_hit: 0,
    total_packs: 0,
    favorites: [],
    ...overrides,
  }
  await env.DB.prepare(
    `INSERT INTO users (id, name, token_hash, packs_available, last_refill_date, packs_since_hit, total_packs, favorites)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      user.id,
      user.name,
      await hashToken(user.token),
      user.packs_available,
      user.last_refill_date,
      user.packs_since_hit,
      user.total_packs,
      JSON.stringify(user.favorites),
    )
    .run()
  return user
}

export const auth = (token = TEST_TOKEN): RequestInit => ({
  headers: { Authorization: `Bearer ${token}` },
})

export const jsonBody = (body: unknown, token = TEST_TOKEN): RequestInit => ({
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

/** Provider falso: sv03.5 das fixtures reais, qualquer outro set é null. */
export function fixtureProvider(): CardProvider {
  const catalog = buildCatalog('sv03.5', 'pt', enFixture as CatalogData, ptFixture as CatalogData)
  return { getSet: async (setId: string) => (setId === 'sv03.5' ? catalog : null) }
}
