import { request } from '../../shared/lib/http'
import { getToken } from '../auth/session'
import type { HistoryPage, OpenedPack } from './model'

/** `POST /api/packs`. Idempotente por `pack_id`: retentar com o mesmo id nunca abre dois. */
export function openPack(setId: string, packId: string): Promise<OpenedPack> {
  return request<OpenedPack>('/api/packs', {
    method: 'POST',
    body: { set_id: setId, pack_id: packId },
    token: getToken(),
  })
}

/** Página do histórico, mais recentes primeiro; `before` é o cursor `next_before` da página anterior. */
export function fetchHistory(before: string | null, limit = 30): Promise<HistoryPage> {
  const q = new URLSearchParams({ limit: String(limit) })
  if (before) q.set('before', before)
  return request<HistoryPage>(`/api/packs?${q}`, { token: getToken() })
}
