import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { cardImage, isHit } from '../../catalog/model'
import type { PackCard } from '../../packs/model'
import { fanTransform, summarySubtitle, summaryTitle } from '../model'
import s from './opening.module.css'

/** Resumo com leque (§8.10). `children` recebe controles extras (o /lab põe o seletor de tier). */
export function Summary({
  cards,
  onAgain,
  againLabel = 'Abrir outro pacote',
  againDisabled = false,
  children,
}: {
  cards: readonly PackCard[]
  onAgain: () => void
  /** "Volta mais tarde" quando a cota acabou (§7.1). */
  againLabel?: string
  againDisabled?: boolean
  children?: ReactNode
}) {
  const button = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Botão desabilitado não recebe foco: o foco vai para o diálogo.
    const target = againDisabled ? dialog.current : button.current
    target?.focus({ preventScroll: true })
  }, [againDisabled])
  return (
    <div
      ref={dialog}
      className={s.summary}
      role="dialog"
      aria-label="Resumo do pacote"
      tabIndex={-1}
    >
      <div className={s.sumTitle}>{summaryTitle(cards)}</div>
      <div className={s.fan}>
        {cards.map((card, i) => (
          <div
            key={card.n}
            className={`${s.fanCard} ${isHit(card.tier) ? s.hit : ''}`}
            style={
              {
                '--final': fanTransform(i, cards.length),
                '--i': i,
                zIndex: 10 + i,
              } as CSSProperties
            }
          >
            <img
              src={cardImage(card.img, 'low') ?? undefined}
              alt={card.name}
              loading="lazy"
              crossOrigin="anonymous"
            />
          </div>
        ))}
      </div>
      <div className={s.sumSub}>{summarySubtitle(cards)}</div>
      <button
        ref={button}
        type="button"
        className={s.btn}
        onClick={onAgain}
        disabled={againDisabled}
      >
        {againLabel}
      </button>
      {children}
    </div>
  )
}
