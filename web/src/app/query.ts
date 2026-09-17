import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../shared/lib/http'

/** Rede caída e 503 (TCGdex fora) tentam de novo 2×, 1 s entre tentativas; qualquer outro erro da API é definitivo. */
export function shouldRetry(count: number, err: unknown): boolean {
  if (count >= 2) return false
  return !(err instanceof ApiError) || err.status === 503
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, retryDelay: 1000, refetchOnWindowFocus: false },
    },
  })
}
