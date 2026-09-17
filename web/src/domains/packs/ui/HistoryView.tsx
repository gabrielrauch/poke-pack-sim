import { packPath, PATHS } from '../../../shared/lib/router'
import { Link } from '../../../shared/ui/Link'
import sh from '../../../shared/ui/shared.module.css'
import { cardImage } from '../../catalog/model'
import { openedAtText, type HistoryPack } from '../model'
import s from './packs.module.css'

/** Histórico (§7.1): mais recentes primeiro, 5 minis, dourado nos hits; toque reabre em modo leitura. */
export function HistoryView({
  packs,
  hasMore,
  onMore,
  loadingMore,
  empty,
}: {
  packs: readonly HistoryPack[]
  hasMore: boolean
  onMore: () => void
  loadingMore: boolean
  empty: boolean
}) {
  return (
    <main className={sh.screen}>
      <header className={sh.header}>
        <h1>Histórico</h1>
      </header>
      {empty && (
        <p className={sh.note}>
          Nenhum pacote aberto ainda. <Link to={PATHS.home}>Abrir o primeiro</Link>
        </p>
      )}
      <ul className={s.list}>
        {packs.map((p) => (
          <li key={p.pack_id}>
            <Link to={packPath(p.pack_id)} className={`${s.row} ${p.hit ? s.hitRow : ''}`}>
              <span className={s.minis}>
                {p.cards.map((c, i) => (
                  <img
                    key={i}
                    src={cardImage(c.img, 'low') ?? undefined}
                    alt=""
                    loading="lazy"
                    crossOrigin="anonymous"
                  />
                ))}
              </span>
              <span className={s.rowText}>
                <b>{p.hit ? 'Puxada grande' : (p.cards[p.cards.length - 1]?.name ?? '')}</b>
                <span className={sh.muted}>{openedAtText(p.opened_at)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {hasMore && (
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <button type="button" className={sh.btn} onClick={onMore} disabled={loadingMore}>
            Carregar mais
          </button>
        </p>
      )}
    </main>
  )
}
