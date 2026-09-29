import { lazy, Suspense, useMemo } from 'react'
import { hasWebGL2 } from '../../../shared/lib/webgl'
import { cardImage, TIER_LABEL } from '../../catalog/model'
import { countsText, firstPulledText, viewerCard, type AlbumCard, type Owned } from '../model'
import s from './collection.module.css'

const CardViewerStage = lazy(() => import('../../opening/ui/CardViewerStage'))

/** Carta em alta com as contagens (§7.1). Fecha por botão, fundo ou Escape. */
export function CardSheet({
  card,
  owned,
  onClose,
}: {
  card: AlbumCard
  owned: Owned
  onClose: () => void
}) {
  const webgl = useMemo(hasWebGL2, [])
  const viewed = useMemo(() => viewerCard(card, owned), [card, owned])
  const still = (
    <img
      className={s.still}
      src={cardImage(card.img, 'high') ?? undefined}
      alt={card.name}
      crossOrigin="anonymous"
    />
  )
  return (
    <div className={s.backdrop} onClick={onClose}>
      <div
        className={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={card.name}
        tabIndex={-1}
        ref={(el) => el?.focus({ preventScroll: true })}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        {/* Com WebGL2, o mesmo holo e tilt da abertura; sem, a imagem parada de sempre. */}
        {webgl ? (
          <Suspense fallback={<div className={s.stage}>{still}</div>}>
            <CardViewerStage card={viewed} className={s.stage} />
          </Suspense>
        ) : (
          still
        )}
        <b>{card.name}</b>
        <span>
          #{card.n} · {TIER_LABEL[card.tier]}
        </span>
        <span>{countsText(owned)}</span>
        <span>{firstPulledText(owned.first)}</span>
        <button type="button" className={s.close} onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  )
}
