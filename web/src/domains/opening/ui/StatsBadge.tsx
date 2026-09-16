import { useEffect, useRef, type RefObject } from 'react'
import type { OpeningScene } from '../hooks/useOpeningScene'
import s from './opening.module.css'

/** fps, ms por frame, draw calls, triângulos e pixel ratio, 4× por segundo, sem estado React. */
export function StatsBadge({ sceneRef }: { sceneRef: RefObject<OpeningScene | null> }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const id = window.setInterval(() => {
      const st = sceneRef.current?.stats()
      if (!ref.current || !st) return
      ref.current.textContent = `${st.fps.toFixed(0)} fps · ${st.frameMs.toFixed(1)} ms · ${st.calls} dc · ${(st.triangles / 1000).toFixed(1)}k tri · dpr ${st.dpr}`
    }, 250)
    return () => window.clearInterval(id)
  }, [sceneRef])
  return <span ref={ref} className={s.stats} />
}
