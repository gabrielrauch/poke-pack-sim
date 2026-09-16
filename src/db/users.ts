import { applyRefill, type Allowance } from '../pack'

export type UserRow = {
  id: string
  name: string
  token_hash: string
  packs_available: number
  last_refill_date: string | null
  packs_since_hit: number
  total_packs: number
  favorites: string
}

export async function findUserByTokenHash(
  db: D1Database,
  tokenHash: string,
): Promise<UserRow | null> {
  const row = await db
    .prepare('SELECT * FROM users WHERE token_hash = ?')
    .bind(tokenHash)
    .first<UserRow>()
  return row ?? null
}

/** `users.favorites` é JSON de nomes; qualquer coisa fora disso vira lista vazia. */
export function favoritesOf(user: Pick<UserRow, 'favorites'>): string[] {
  try {
    const parsed: unknown = JSON.parse(user.favorites)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

/** Recarga preguiçosa persistida. Devolve a mesma linha quando nada muda. */
export async function persistRefill(
  db: D1Database,
  user: UserRow,
  today: string,
  allowance: Allowance,
): Promise<UserRow> {
  const state = { packsAvailable: user.packs_available, lastRefillDate: user.last_refill_date }
  const next = applyRefill(state, today, allowance)
  if (next === state) return user
  // Condicional na data que a chamada viu: duas requisições no mesmo dia não recarregam duas vezes.
  const { meta } = await db
    .prepare(
      'UPDATE users SET packs_available = ?, last_refill_date = ? WHERE id = ? AND last_refill_date IS ?',
    )
    .bind(next.packsAvailable, next.lastRefillDate, user.id, user.last_refill_date)
    .run()
  if (meta.changes === 0) {
    // Outra requisição recarregou antes: a linha do banco é a verdade.
    const fresh = await db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(user.id)
      .first<UserRow>()
    return fresh ?? user
  }
  return { ...user, packs_available: next.packsAvailable, last_refill_date: next.lastRefillDate }
}
