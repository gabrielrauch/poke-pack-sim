import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { prefersReducedMotion } from '../../../shared/lib/motion'
import type { ThemeColors } from '../../../shared/lib/theme'
import type { PackArt } from '../../catalog/model'
import type { PackCard } from '../../packs/model'
import { OpeningScene, type SceneCallbacks } from '../engine/OpeningScene'

export type { OpeningScene, PackArt, SceneCallbacks, SceneStats } from '../engine/OpeningScene'
export type { State } from '../engine/sequence'

export type OpeningSceneInput = {
  /** Muda a cada pacote: a cena zera e o pacote fechado entra, mesmo antes das cartas. */
  session: string | number
  /** `null` enquanto o `POST /api/packs` não respondeu. */
  pack: PackCard[] | null
  /** `null` enquanto o catálogo não chegou (o pacote só aparece com nome e logo). */
  art: PackArt | null
  colors: ThemeColors
  callbacks: SceneCallbacks
}

/**
 * Monta a engine no container (ela cria o próprio canvas), `present(art)` a cada sessão e
 * `load(pack)` quando as cartas chegam. StrictMode-safe: cada montagem cria e destrói a própria cena.
 * Os callbacks sempre apontam para a versão mais recente.
 */
export function useOpeningScene({ session, pack, art, colors, callbacks }: OpeningSceneInput): {
  containerRef: RefObject<HTMLDivElement | null>
  sceneRef: RefObject<OpeningScene | null>
} {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<OpeningScene | null>(null)
  const callbacksRef = useRef(callbacks)
  const colorsRef = useRef(colors)
  useLayoutEffect(() => {
    callbacksRef.current = callbacks
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const forward: SceneCallbacks = {
      onState: (s) => callbacksRef.current.onState?.(s),
      onReveal: (i) => callbacksRef.current.onReveal?.(i),
      onDismiss: (i) => callbacksRef.current.onDismiss?.(i),
      onFinish: () => callbacksRef.current.onFinish?.(),
      onNudge: () => callbacksRef.current.onNudge?.(),
      vibrate: (p) => callbacksRef.current.vibrate?.(p),
    }
    const scene = new OpeningScene(container, colorsRef.current, forward, {
      reducedMotion: prefersReducedMotion(),
    })
    sceneRef.current = scene
    // Só em dev: deixa o /lab inspecionar a cena pelo console (estado, stats, tweens).
    if (import.meta.env.DEV) (window as unknown as { __scene?: OpeningScene }).__scene = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  // Ordem dos efeitos importa: present() antes de load() na mesma sessão.
  useEffect(() => {
    const scene = sceneRef.current
    if (scene && art) void scene.present(art)
  }, [session, art])

  useEffect(() => {
    const scene = sceneRef.current
    if (scene && art && pack) void scene.load(pack)
  }, [session, art, pack])

  return { containerRef, sceneRef }
}
