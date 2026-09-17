import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { fetchHistory, openPack } from './api'

/**
 * A abertura é uma query pela chave `pack_id`: como a API é idempotente por id, `refetch()` é a
 * retentativa do §7.2 (mesmo id), o StrictMode não abre dois pacotes e o resultado nunca fica velho.
 */
export function useOpenPack(setId: string, packId: string) {
  return useQuery({
    queryKey: ['pack', packId],
    queryFn: () => openPack(setId, packId),
    staleTime: Infinity,
    refetchOnReconnect: false,
  })
}

export function useHistory() {
  return useInfiniteQuery({
    queryKey: ['history'],
    queryFn: ({ pageParam }) => fetchHistory(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_before,
  })
}
