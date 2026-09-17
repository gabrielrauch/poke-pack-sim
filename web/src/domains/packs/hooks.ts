import { useQuery } from '@tanstack/react-query'
import { openPack } from './api'

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
