import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { fetchMe } from './api'
import { refillDelay } from './model'
import { getToken, subscribeSession } from './session'

const none = () => null

export function useSession(): string | null {
  return useSyncExternalStore(subscribeSession, getToken, none)
}

/** Perfil e cota (§5). A chave leva o token: colar um link novo refaz a consulta. */
export function useMe(token: string | null) {
  return useQuery({
    queryKey: ['me', token],
    queryFn: fetchMe,
    enabled: token !== null,
    refetchInterval: (query) => {
      const at = query.state.data?.next_refill_at
      return at ? refillDelay(at, Date.now()) : false
    },
  })
}
