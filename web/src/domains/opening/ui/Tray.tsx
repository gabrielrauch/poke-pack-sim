import { cardImage, isHit } from '../../catalog/model'
import type { PackCard } from '../../packs/model'
import s from './opening.module.css'

/** Bandeja das cartas já vistas (§8.6): minis de 44px, anel dourado nos hits. */
export function Tray({ cards }: { cards: readonly PackCard[] }) {
  return (
    <div className={s.tray} aria-hidden="true">
      {cards.map((card) => (
        <div key={card.n} className={`${s.mini} ${isHit(card.tier) ? s.hit : ''}`}>
          <img
            src={cardImage(card.img, 'low') ?? undefined}
            alt=""
            loading="lazy"
            crossOrigin="anonymous"
          />
        </div>
      ))}
    </div>
  )
}
