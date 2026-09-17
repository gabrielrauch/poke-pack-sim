import { request } from '../../shared/lib/http'
import type { Me } from './model'
import { getToken } from './session'

export function fetchMe(): Promise<Me> {
  return request<Me>('/api/me', { token: getToken() })
}
