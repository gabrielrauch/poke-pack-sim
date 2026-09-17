import { useMemo, useState } from 'react'
import { DEFAULT_SET, type Tier } from '../../catalog/model'
import { useAlbum } from '../hooks'
import { tiersIn, type AlbumCard } from '../model'
import { AlbumView } from './AlbumView'

export default function AlbumScreen() {
  const { album, setName, offline } = useAlbum(DEFAULT_SET)
  const [tier, setTier] = useState<Tier | null>(null)
  const [selected, setSelected] = useState<AlbumCard | null>(null)
  const tiers = useMemo(() => (album ? tiersIn(album) : []), [album])
  return (
    <AlbumView
      setName={setName}
      album={album}
      tier={tier}
      tiers={tiers}
      onTier={setTier}
      selected={selected}
      onSelect={setSelected}
      offline={offline}
    />
  )
}
