import { useCallback, useMemo, useRef, useState } from 'react'
import { vibrate } from '../../../shared/lib/haptics'
import { prefersReducedMotion } from '../../../shared/lib/motion'
import { readThemeColors } from '../../../shared/lib/theme'
import type { PackArt } from '../../catalog/model'
import type { PackCard } from '../../packs/model'
import { useOpeningScene, type SceneCallbacks, type State } from '../hooks/useOpeningScene'
import { useTear } from '../hooks/useTear'
import { useTilt } from '../hooks/useTilt'
import { HINT_PREPARING, hintFor } from '../model'
import { Hint } from './Hint'
import s from './opening.module.css'
import { StatsBadge } from './StatsBadge'
import { Tray } from './Tray'

export type OpeningStageProps = {
  /** Muda a cada pacote: zera bandeja e hint, e a cena apresenta o pacote de novo. */
  session: string | number
  pack: PackCard[] | null
  art: PackArt | null
  /** A última carta foi descartada (estado `summary`). */
  onFinished: () => void
  /** Medidor de fps no canto (só o /lab). */
  stats?: boolean
}

/** Cena 3D + bandeja + hint. O resumo é de quem chama (`onFinished`). */
export function OpeningStage({ session, pack, art, onFinished, stats = false }: OpeningStageProps) {
  const [state, setState] = useState<State>('summary')
  const [revealed, setRevealed] = useState(0)
  const [dismissed, setDismissed] = useState<number[]>([])
  const [seen, setSeen] = useState(session)
  if (seen !== session) {
    // Sessão nova: zera durante o render (padrão do React para estado que depende de prop), sem useEffect.
    setSeen(session)
    setRevealed(0)
    setDismissed([])
  }
  const hintRef = useRef<HTMLElement>(null)
  const colors = useMemo(readThemeColors, [])
  const onNudge = useCallback(() => {
    if (prefersReducedMotion()) return
    hintRef.current?.animate([{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }], { duration: 520 })
  }, [])
  const callbacks = useMemo<SceneCallbacks>(
    () => ({
      onState: setState,
      onReveal: (i) => setRevealed(i + 1),
      onDismiss: (i) => setDismissed((d) => [...d, i]),
      onFinish: onFinished,
      onNudge,
      vibrate,
    }),
    [onFinished, onNudge],
  )
  const { containerRef, sceneRef } = useOpeningScene({ session, pack, art, colors, callbacks })
  useTilt(sceneRef, containerRef)
  useTear(sceneRef, containerRef)

  const trayCards = dismissed.map((i) => pack?.[i]).filter((c): c is PackCard => c !== undefined)
  return (
    <>
      <section className={s.scene} tabIndex={0} aria-label="Abertura de pacote">
        <div ref={containerRef} className={s.host} />
        {stats && <StatsBadge sceneRef={sceneRef} />}
        <Tray cards={trayCards} />
      </section>
      <Hint
        ref={hintRef}
        text={art ? hintFor(state, revealed, pack?.length ?? 0) : HINT_PREPARING}
      />
    </>
  )
}
