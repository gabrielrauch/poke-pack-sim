import { useState } from 'react'
import { cardImage } from '../../catalog/model'
import type { PackCard } from '../../packs/model'
import { fallbackHint } from '../model'
import { Hint } from './Hint'
import s from './opening.module.css'
import { Tray } from './Tray'

export type FallbackStageProps = {
  session: string | number
  pack: PackCard[] | null
  onFinished: () => void
}

/** Sem WebGL2 (§8.11): uma carta por toque, com fade, e a mesma bandeja. */
export function FallbackStage({ session, pack, onFinished }: FallbackStageProps) {
  const [revealed, setRevealed] = useState(0)
  const [seen, setSeen] = useState(session)
  if (seen !== session) {
    setSeen(session)
    setRevealed(0)
  }
  const total = pack?.length ?? 0
  const current = pack && revealed > 0 ? pack[revealed - 1] : undefined
  const advance = () => {
    if (!pack) return
    if (revealed >= total) onFinished()
    else setRevealed(revealed + 1)
  }
  return (
    <>
      <section className={s.scene} aria-label="Abertura de pacote">
        <button type="button" className={s.fbTap} onClick={advance} disabled={!pack}>
          {current ? (
            <img
              key={current.n}
              className={s.fbCard}
              src={cardImage(current.img, 'high') ?? undefined}
              alt={current.name}
              crossOrigin="anonymous"
            />
          ) : (
            <span className={s.fbPack}>{pack ? 'Abrir' : '…'}</span>
          )}
        </button>
        <Tray cards={pack ? pack.slice(0, Math.max(0, revealed - 1)) : []} />
      </section>
      <Hint text={fallbackHint(revealed, total, pack !== null)} />
    </>
  )
}
