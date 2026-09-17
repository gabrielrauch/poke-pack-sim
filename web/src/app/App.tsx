import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { useMe, useSession } from '../domains/auth/hooks'
import { isUnauthorized } from '../domains/auth/model'
import { saveSession } from '../domains/auth/session'
import { AccessScreen } from '../domains/auth/ui/AccessScreen'
import HomeScreen from '../domains/packs/ui/HomeScreen'
import { PATHS, usePathname } from '../shared/lib/router'
import { Link } from '../shared/ui/Link'
import sh from '../shared/ui/shared.module.css'
import { TabBar } from '../shared/ui/TabBar'
import s from './app.module.css'
import { prefetchOpening } from './prefetch'
import { matchRoute } from './router'

/** three e a engine só entram nos chunks destas telas (§8.11); álbum e histórico nunca carregam Three. */
const OpenScreen = lazy(() => import('../domains/opening/ui/OpenScreen'))
const LabScreen = lazy(() => import('../domains/opening/ui/LabScreen'))
const AlbumScreen = lazy(() => import('../domains/collection/ui/AlbumScreen'))
const HistoryScreen = lazy(() => import('../domains/packs/ui/HistoryScreen'))
const PackScreen = lazy(() => import('../domains/packs/ui/PackScreen'))

export function App() {
  const route = matchRoute(usePathname())
  const token = useSession()
  const me = useMe(route.name === 'lab' ? null : token)
  // Da Home, o chunk da abertura baixa em idle (§8.11).
  useEffect(() => {
    if (route.name === 'home') prefetchOpening()
  }, [route.name])

  if (route.name === 'lab') return <Lazy screen={<LabScreen />} />
  if (!token) return <AccessScreen reason="missing" onSubmit={saveSession} />
  if (isUnauthorized(me.error)) return <AccessScreen reason="invalid" onSubmit={saveSession} />
  if (route.name === 'open') return <Lazy screen={<OpenScreen />} />
  return (
    <>
      <Screen route={route} />
      <TabBar />
    </>
  )
}

function Screen({ route }: { route: ReturnType<typeof matchRoute> }) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />
    case 'album':
      return <Lazy screen={<AlbumScreen />} />
    case 'history':
      return <Lazy screen={<HistoryScreen />} />
    case 'pack':
      return <Lazy screen={<PackScreen id={route.id} />} />
    case 'missing':
      return <NotFound />
  }
}

function NotFound() {
  return (
    <main className={sh.screen}>
      <p className={sh.note}>Essa página não existe.</p>
      <p style={{ textAlign: 'center' }}>
        <Link className={sh.btn} to={PATHS.home}>
          Ir para o início
        </Link>
      </p>
    </main>
  )
}

function Lazy({ screen }: { screen: ReactNode }) {
  return <Suspense fallback={<Loading />}>{screen}</Suspense>
}

function Loading() {
  return (
    <main className={s.home}>
      <p>Carregando…</p>
    </main>
  )
}
