import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { vibrate } from '../../../shared/lib/haptics'
import { readThemeColors } from '../../../shared/lib/theme'
import { TIER_LABEL } from '../../catalog/model'
import type { PackCard } from '../../packs/model'
import {
  useOpeningScene,
  type OpeningScene,
  type SceneCallbacks,
  type State,
} from '../hooks/useOpeningScene'
import { useTear } from '../hooks/useTear'
import { useTilt } from '../hooks/useTilt'
import { LAB_ART, LAB_TIERS, labPack, labTierFromUrl, type LabTier } from '../lab'
import { hintFor } from '../model'
import { Hint } from './Hint'
import s from './opening.module.css'
import { Summary } from './Summary'
import { Tray } from './Tray'

/** Protótipo da etapa 5: dados falsos, imagens reais, medidor de fps. `/lab?tier=hyper_rare` escolhe a última carta. */
export default function LabScreen() {
  const initialTier = labTierFromUrl(window.location.search)
  const [tier, setTier] = useState<LabTier>(initialTier)
  const [pack, setPack] = useState<PackCard[]>(() => labPack(initialTier))
  const [packNo, setPackNo] = useState(1)
  const [state, setState] = useState<State>('summary')
  const [revealed, setRevealed] = useState(0)
  const [dismissed, setDismissed] = useState<number[]>([])
  const hintRef = useRef<HTMLElement>(null)
  const colors = useMemo(readThemeColors, [])
  const callbacks = useMemo<SceneCallbacks>(
    () => ({
      onState: setState,
      onReveal: (i) => setRevealed(i + 1),
      onDismiss: (i) => setDismissed((d) => [...d, i]),
      onNudge: () => {
        hintRef.current?.animate([{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }], {
          duration: 520,
        })
      },
      vibrate,
    }),
    [],
  )
  const { containerRef, sceneRef } = useOpeningScene({ pack, art: LAB_ART, colors, callbacks })
  useTilt(sceneRef, containerRef)
  useTear(sceneRef, containerRef)

  const again = useCallback(() => {
    setPack(labPack(tier))
    setRevealed(0)
    setDismissed([])
    setPackNo((n) => n + 1)
  }, [tier])

  const finished = state === 'summary' && dismissed.length === pack.length
  return (
    <div className={s.stage}>
      <header className={s.top}>
        <b>151</b>
        <span>Pacote {packNo}</span>
        <StatsBadge sceneRef={sceneRef} />
      </header>
      <section className={s.scene} tabIndex={0} aria-label="Abertura de pacote">
        <div ref={containerRef} className={s.host} />
        <Tray cards={dismissed.map((i) => pack[i]!)} />
      </section>
      <Hint ref={hintRef} text={hintFor(state, revealed, pack.length)} />
      {finished && (
        <Summary cards={pack} onAgain={again}>
          <label className={s.opt}>
            Última carta
            <select value={tier} onChange={(e) => setTier(e.target.value as LabTier)}>
              {LAB_TIERS.map((t) => (
                <option key={t} value={t}>
                  {TIER_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        </Summary>
      )}
    </div>
  )
}

/** fps, ms por frame, draw calls, triângulos e pixel ratio, 4× por segundo, sem estado React. */
function StatsBadge({ sceneRef }: { sceneRef: RefObject<OpeningScene | null> }) {
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
