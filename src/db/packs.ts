export type PackRow = {
  id: string
  user_id: string
  set_id: string
  opened_at: string
  /** JSON do array `cards` da resposta de POST /api/packs. */
  cards: string
  hit: number
}

export type StoredCard = {
  n: string
  name: string
  tier: string
  reverse: boolean
  img: string | null
  new: boolean
}

export async function findPack(db: D1Database, packId: string): Promise<PackRow | null> {
  return (
    (await db.prepare('SELECT * FROM packs WHERE id = ?').bind(packId).first<PackRow>()) ?? null
  )
}

export type OpenPack = {
  packId: string
  userId: string
  setId: string
  openedAt: string
  cards: StoredCard[]
  hit: boolean
  packsSinceHit: number
}

/**
 * As três escritas de uma abertura, para um único `db.batch()` (transação no D1):
 * a chave primária de `packs` rejeita repetição, o CHECK de `users.packs_available` rejeita abrir sem cota.
 */
export function openPackStatements(db: D1Database, pack: OpenPack): D1PreparedStatement[] {
  const insertPack = db
    .prepare(
      'INSERT INTO packs (id, user_id, set_id, opened_at, cards, hit) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(
      pack.packId,
      pack.userId,
      pack.setId,
      pack.openedAt,
      JSON.stringify(pack.cards),
      pack.hit ? 1 : 0,
    )
  const charge = db
    .prepare(
      `UPDATE users
         SET packs_available = packs_available - 1,
             total_packs = total_packs + 1,
             packs_since_hit = ?
       WHERE id = ?`,
    )
    .bind(pack.packsSinceHit, pack.userId)
  const owned = pack.cards.map((card) =>
    db
      .prepare(
        `INSERT INTO owned (user_id, set_id, card_n, count_normal, count_reverse, first_pulled_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, set_id, card_n) DO UPDATE SET
           count_normal = count_normal + excluded.count_normal,
           count_reverse = count_reverse + excluded.count_reverse`,
      )
      .bind(
        pack.userId,
        pack.setId,
        card.n,
        card.reverse ? 0 : 1,
        card.reverse ? 1 : 0,
        pack.openedAt,
      ),
  )
  return [insertPack, charge, ...owned]
}

export async function listPacks(
  db: D1Database,
  userId: string,
  limit: number,
  before: { openedAt: string; id: string } | null,
): Promise<PackRow[]> {
  const openedAt = before?.openedAt ?? null
  const id = before?.id ?? null
  const { results } = await db
    .prepare(
      `SELECT * FROM packs
        WHERE user_id = ?
          AND (? IS NULL OR opened_at < ? OR (opened_at = ? AND id < ?))
        ORDER BY opened_at DESC, id DESC
        LIMIT ?`,
    )
    .bind(userId, openedAt, openedAt, openedAt, id, limit)
    .all<PackRow>()
  return results
}
