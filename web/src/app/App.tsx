import { lazy, Suspense } from 'react'
import s from './app.module.css'

/** three e a engine só entram nos chunks destas telas (§8.11); álbum e histórico nunca carregam Three. */
const OpenScreen = lazy(() => import('../domains/opening/ui/OpenScreen'))
const LabScreen = lazy(() => import('../domains/opening/ui/LabScreen'))

const pathname = () => (typeof window === 'undefined' ? '/' : window.location.pathname)

export function App() {
  const path = pathname()
  if (path === '/abrir') {
    return (
      <Suspense fallback={<Loading />}>
        <OpenScreen />
      </Suspense>
    )
  }
  if (path === '/lab') {
    return (
      <Suspense fallback={<Loading />}>
        <LabScreen />
      </Suspense>
    )
  }
  return <Home />
}

/** Placeholder até a etapa 7 (Início de verdade, com contador e hora da recarga). */
function Home() {
  return (
    <main className={s.home}>
      <h1>pack-sim</h1>
      <a className={s.cta} href="/abrir">
        Abrir pacote
      </a>
    </main>
  )
}

function Loading() {
  return (
    <main className={s.home}>
      <p>Carregando…</p>
    </main>
  )
}
