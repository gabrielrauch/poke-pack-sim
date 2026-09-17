import { request } from '../../shared/lib/http'
import { getToken } from '../auth/session'
import type { Collection } from './model'

export function fetchCollection(setId: string): Promise<Collection> {
  return request<Collection>(`/api/collection/${encodeURIComponent(setId)}`, {
    token: getToken(),
  })
}
