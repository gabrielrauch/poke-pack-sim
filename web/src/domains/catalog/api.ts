import { request } from '../../shared/lib/http'
import type { SetCatalog } from './model'

export function fetchCatalog(setId: string): Promise<SetCatalog> {
  return request<SetCatalog>(`/api/catalog/${encodeURIComponent(setId)}`)
}
