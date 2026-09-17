import { PATHS } from '../../../shared/lib/router'
import { Link } from '../../../shared/ui/Link'
import sh from '../../../shared/ui/shared.module.css'
import { cardImage, isHit, TIER_LABEL } from '../../catalog/model'
import { openedAtText, type HistoryPack } from '../model'
import s from './packs.module.css'

/** Pacote reaberto em modo leitura (§7.1): as 5 cartas, tier, "Nova" e o hit em dourado. */
export function PackView({ pack }: { pack: HistoryPack }) {
  return (
    <main className={sh.screen}>
      <header className={sh.header}>
        <Link className={sh.back} to={PATHS.history}>
          ‹ Histórico
        </Link>
        <span className={sh.muted}>{openedAtText(pack.opened_at)}</span>
      </header>
      <h1 className={s.packTitle}>{pack.hit ? 'Que puxada!' : 'Pacote aberto'}</h1>
      <ul className={s.cards}>
        {pack.cards.map((c) => (
          <li key={c.n} className={isHit(c.tier) ? s.hitCard : ''}>
            <img
              src={cardImage(c.img, 'low') ?? undefined}
              alt={c.name}
              loading="lazy"
              crossOrigin="anonymous"
            />
            {c.new && <span className={s.badge}>Nova</span>}
            <b>{c.name}</b>
            <span className={sh.muted}>
              {TIER_LABEL[c.tier]}
              {c.reverse ? ' · reverse' : ''}
            </span>
          </li>
        ))}
      </ul>
    </main>
  )
}
