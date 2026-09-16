import { lazy, Suspense } from 'react'

/** A engine (e o three) só entram no chunk desta tela. */
const LabScreen = lazy(() => import('../domains/opening/ui/LabScreen'))

const pathname = () => (typeof window === 'undefined' ? '/' : window.location.pathname)

export function App() {
  if (pathname() === '/lab') {
    return (
      <Suspense fallback={null}>
        <LabScreen />
      </Suspense>
    )
  }
  return (
    <main style={{ padding: 24 }}>
      <h1>pack-sim</h1>
      <p>Scaffold pronto.</p>
    </main>
  )
}
