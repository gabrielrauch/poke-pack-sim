import { Hono } from 'hono'
import { ownedInSet } from '../db/owned'
import { findPack, listPacks, openPackStatements, type PackRow, type StoredCard } from '../db/packs'
import { favoritesOf, persistRefill, type UserRow } from '../db/users'
import { buildPack, missingTiers, recipeForSet, seedFromBytes } from '../pack'
import { ALLOWANCE } from './allowance'
import { requireUser } from './auth'
import { SET_ID, type AppDeps, type AppEnv } from './env'
import { nextRefillAt, refillPeriod } from './time'

/** ULID, UUID ou qualquer id gerado no cliente. */
const PACK_ID = /^[A-Za-z0-9_-]{8,64}$/

type OpenBody = { set_id: string; pack_id: string }

/** Cursor do histórico: `<opened_at ISO>|<pack_id>`, para páginas com o mesmo instante não pularem linhas. */
const cursorOf = (row: PackRow) => `${row.opened_at}|${row.id}`

function parseCursor(raw: string | undefined): { openedAt: string; id: string } | null {
  if (raw === undefined) return null
  const sep = raw.lastIndexOf('|')
  const datePart = sep === -1 ? raw : raw.slice(0, sep)
  const id = sep === -1 ? '' : raw.slice(sep + 1)
  const time = Date.parse(datePart)
  if (Number.isNaN(time)) return null
  return { openedAt: new Date(time).toISOString(), id }
}

function parseBody(raw: unknown): OpenBody | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { set_id, pack_id } = raw as Record<string, unknown>
  if (typeof set_id !== 'string' || !SET_ID.test(set_id)) return null
  if (typeof pack_id !== 'string' || !PACK_ID.test(pack_id)) return null
  return { set_id, pack_id }
}

async function seedFor(packId: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(packId))
  return seedFromBytes(new Uint8Array(digest))
}

function packResponse(row: PackRow, user: UserRow) {
  return {
    pack_id: row.id,
    set_id: row.set_id,
    opened_at: row.opened_at,
    cards: JSON.parse(row.cards) as StoredCard[],
    hit: row.hit === 1,
    packs_available: user.packs_available,
  }
}

export function packRoutes({ provider, now = () => new Date() }: AppDeps) {
  const app = new Hono<AppEnv>()

  app.post('/api/packs', requireUser, async (c) => {
    const body = parseBody(await c.req.json().catch(() => null))
    if (!body) return c.json({ error: 'BAD_REQUEST' }, 400)
    const db = c.env.DB
    const at = now()

    // Idempotência: pack_id repetido devolve o pacote gravado, sem cobrar de novo.
    const existing = await findPack(db, body.pack_id)
    if (existing) {
      if (existing.user_id !== c.get('user').id || existing.set_id !== body.set_id) {
        return c.json({ error: 'PACK_MISMATCH' }, 409)
      }
      return c.json(packResponse(existing, c.get('user')))
    }

    const user = await persistRefill(
      db,
      c.get('user'),
      refillPeriod(at, ALLOWANCE.hours),
      ALLOWANCE,
    )
    if (user.packs_available <= 0) {
      return c.json(
        { error: 'NO_PACKS', next_refill_at: nextRefillAt(at, ALLOWANCE.hours).toISOString() },
        409,
      )
    }

    const recipe = recipeForSet(body.set_id)
    if (!recipe) return c.json({ error: 'NOT_FOUND' }, 404)
    const catalog = await provider.getSet(body.set_id, 'pt')
    if (!catalog) return c.json({ error: 'NOT_FOUND' }, 404)
    const missing = missingTiers(recipe, catalog)
    if (missing.length > 0) return c.json({ error: 'SET_UNSUPPORTED', missing }, 409)

    const built = buildPack({
      catalog,
      recipe,
      profile: { packsSinceHit: user.packs_since_hit, favorites: favoritesOf(user) },
      seed: await seedFor(body.pack_id),
    })
    const ownedBefore = new Set((await ownedInSet(db, user.id, body.set_id)).map((r) => r.card_n))
    const cards: StoredCard[] = built.cards.map((card) => ({
      n: card.n,
      name: card.name,
      tier: card.tier,
      reverse: card.variant === 'reverse',
      img: card.img,
      new: !ownedBefore.has(card.n),
    }))
    const openedAt = at.toISOString()
    const pack = {
      packId: body.pack_id,
      userId: user.id,
      setId: body.set_id,
      openedAt,
      cards,
      hit: built.hit,
    }

    try {
      await db.batch(openPackStatements(db, pack))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // Corrida com o mesmo pack_id: a outra requisição gravou primeiro; devolve o que está no banco.
      if (/UNIQUE constraint failed: packs\.id/.test(message)) {
        const stored = await findPack(db, body.pack_id)
        if (stored) {
          if (stored.user_id !== user.id || stored.set_id !== body.set_id) {
            return c.json({ error: 'PACK_MISMATCH' }, 409)
          }
          return c.json(packResponse(stored, user))
        }
      }
      // Corrida com outro pack_id: o CHECK do banco negou a última unidade de cota.
      if (/CHECK constraint failed/.test(message)) {
        return c.json(
          { error: 'NO_PACKS', next_refill_at: nextRefillAt(at, ALLOWANCE.hours).toISOString() },
          409,
        )
      }
      throw err
    }

    return c.json({
      pack_id: body.pack_id,
      set_id: body.set_id,
      opened_at: openedAt,
      cards,
      hit: built.hit,
      packs_available: user.packs_available - 1,
    })
  })

  app.get('/api/packs', requireUser, async (c) => {
    const rawLimit = Number(c.req.query('limit') ?? '30')
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 30
    const before = parseCursor(c.req.query('before'))
    const rows = await listPacks(c.env.DB, c.get('user').id, limit + 1, before)
    const page = rows.slice(0, limit)
    c.header('Cache-Control', 'private, no-store')
    return c.json({
      packs: page.map((row) => ({
        pack_id: row.id,
        set_id: row.set_id,
        opened_at: row.opened_at,
        hit: row.hit === 1,
        cards: JSON.parse(row.cards) as StoredCard[],
      })),
      next_before: rows.length > limit ? cursorOf(page[page.length - 1]!) : null,
    })
  })

  return app
}
