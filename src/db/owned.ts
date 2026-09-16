export type OwnedRow = { card_n: string; count_normal: number; count_reverse: number }

export async function ownedInSet(
  db: D1Database,
  userId: string,
  setId: string,
): Promise<OwnedRow[]> {
  const { results } = await db
    .prepare(
      'SELECT card_n, count_normal, count_reverse FROM owned WHERE user_id = ? AND set_id = ?',
    )
    .bind(userId, setId)
    .all<OwnedRow>()
  return results
}
