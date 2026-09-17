import { useMemo } from 'react'
import { useMe, useSession } from '../../auth/hooks'
import { useCatalog, useImage } from '../../catalog/hooks'
import { DEFAULT_SET, packArt } from '../../catalog/model'
import { classifyOpenError, openFailureText } from '../model'
import { HomeView } from './HomeView'

export default function HomeScreen() {
  const me = useMe(useSession())
  const catalog = useCatalog(DEFAULT_SET)
  // `packArt` cria um objeto novo a cada render; sem memo o `ref` do canvas repintaria toda hora.
  const art = useMemo(() => (catalog.data ? packArt(catalog.data) : null), [catalog.data])
  const logo = useImage(art?.logo ?? null)
  const failure = me.error ? openFailureText(classifyOpenError(me.error)) : null
  return (
    <HomeView
      me={me.data ?? null}
      art={art}
      logo={logo.data ?? null}
      failure={failure}
      onRetry={() => void me.refetch()}
    />
  )
}
