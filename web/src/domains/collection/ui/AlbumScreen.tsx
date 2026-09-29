import { useMemo, useState } from 'react'
import { SETS, type Tier } from '../../catalog/model'
import { selectSet, useSelectedSet } from '../../catalog/selectedSet'
import { useAlbum } from '../hooks'
import { tiersIn, type AlbumCard } from '../model'
import { AlbumView } from './AlbumView'

export default function AlbumScreen() {
  const setId = useSelectedSet()
  const { album, setName, offline } = useAlbum(setId)
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
      sets={SETS}
      setId={setId}
      onSet={(id) => {
        // O filtro de raridade pode não existir no outro set.
        setTier(null)
        selectSet(id)
      }}
    />
  )
}
