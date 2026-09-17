import { useQuery } from '@tanstack/react-query'
import { loadImage } from '../../shared/lib/image'
import { fetchCatalog } from './api'

/** Catálogo do set (207 cartas). O Worker manda `max-age=3600`; aqui fica fresco por 1 h também. */
export function useCatalog(setId: string) {
  return useQuery({
    queryKey: ['catalog', setId],
    queryFn: () => fetchCatalog(setId),
    staleTime: 60 * 60 * 1000,
  })
}

/** Imagem com CORS já decodificada (logo do set para o canvas do Início). `null` sem URL ou em erro. */
export function useImage(url: string | null) {
  return useQuery({
    queryKey: ['image', url],
    queryFn: () => loadImage(url),
    enabled: url !== null,
    staleTime: Infinity,
  })
}
