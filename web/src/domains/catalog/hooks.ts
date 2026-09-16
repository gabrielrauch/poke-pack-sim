import { useQuery } from '@tanstack/react-query'
import { fetchCatalog } from './api'

/** Catálogo do set (207 cartas). O Worker manda `max-age=3600`; aqui fica fresco por 1 h também. */
export function useCatalog(setId: string) {
  return useQuery({
    queryKey: ['catalog', setId],
    queryFn: () => fetchCatalog(setId),
    staleTime: 60 * 60 * 1000,
  })
}
