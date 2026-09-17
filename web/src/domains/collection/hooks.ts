import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCatalog } from '../catalog/hooks'
import { fetchCollection } from './api'
import { buildAlbum } from './model'

export function useCollection(setId: string) {
  return useQuery({ queryKey: ['collection', setId], queryFn: () => fetchCollection(setId) })
}

/** Catálogo + coleção mesclados no cliente (§2). Offline o service worker responde os dois. */
export function useAlbum(setId: string) {
  const catalog = useCatalog(setId)
  const collection = useCollection(setId)
  const album = useMemo(
    () =>
      catalog.data && collection.data ? buildAlbum(catalog.data.cards, collection.data) : null,
    [catalog.data, collection.data],
  )
  const offline = album === null && (catalog.isError || collection.isError)
  return { album, setName: catalog.data?.name ?? '', offline }
}
