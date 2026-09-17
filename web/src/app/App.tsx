import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { useMe, useSession } from '../domains/auth/hooks'
import { isUnauthorized } from '../domains/auth/model'
import { saveSession } from '../domains/auth/session'
import { AccessScreen } from '../domains/auth/ui/AccessScreen'
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
      return <Home />
    case 'missing':
      return <NotFound />
    default:
      return <Placeholder name={route.name} />
  }
}

/** Placeholder até a etapa 7 (Início de verdade, com contador e hora da recarga). */
function Home() {
  return (
    <main className={s.home}>
      <h1>pack-sim</h1>
      <Link className={s.cta} to={PATHS.open}>
        Abrir pacote
      </Link>
    </main>
  )
}

/** Trocado pelas telas das tarefas 2 a 4. */
function Placeholder({ name }: { name: string }) {
  return (
    <main className={sh.screen}>
      <p className={sh.note}>{name}</p>
    </main>
  )
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
