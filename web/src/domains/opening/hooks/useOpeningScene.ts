import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import type { ThemeColors } from '../../../shared/lib/theme'
import type { PackCard } from '../../packs/model'
import { OpeningScene, type PackArt, type SceneCallbacks } from '../engine/OpeningScene'

export type { OpeningScene, PackArt, SceneCallbacks, SceneStats } from '../engine/OpeningScene'
export type { State } from '../engine/sequence'

export type OpeningSceneInput = {
  pack: PackCard[] | null
  art: PackArt
  colors: ThemeColors
  callbacks: SceneCallbacks
}

/**
 * Monta a engine no container (ela cria o próprio canvas) e chama `run(pack)` a cada pacote novo.
 * StrictMode-safe: cada montagem cria e destrói a própria cena. Os callbacks sempre apontam para a versão mais recente.
 */
export function useOpeningScene({ pack, art, colors, callbacks }: OpeningSceneInput): {
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
    const scene = new OpeningScene(container, colorsRef.current, forward)
    sceneRef.current = scene
    // Só em dev: deixa o /lab inspecionar a cena pelo console (estado, stats, tweens).
    if (import.meta.env.DEV) (window as unknown as { __scene?: OpeningScene }).__scene = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (scene && pack) void scene.run(pack, art)
  }, [pack, art])

  return { containerRef, sceneRef }
}
