import { request } from '../../shared/lib/http'
import { getToken } from '../auth/session'
import type { OpenedPack } from './model'

/** `POST /api/packs`. Idempotente por `pack_id`: retentar com o mesmo id nunca abre dois. */
export function openPack(setId: string, packId: string): Promise<OpenedPack> {
  return request<OpenedPack>('/api/packs', {
    method: 'POST',
    body: { set_id: setId, pack_id: packId },
    token: getToken(),
  })
}
