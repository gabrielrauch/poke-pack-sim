import { cardImage, TIER_LABEL } from '../../catalog/model'
import { countsText, firstPulledText, type AlbumCard, type Owned } from '../model'
import s from './collection.module.css'

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
        <img
          src={cardImage(card.img, 'high') ?? undefined}
          alt={card.name}
          crossOrigin="anonymous"
        />
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
