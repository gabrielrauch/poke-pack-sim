import { PATHS } from '../../../shared/lib/router'
import { Link } from '../../../shared/ui/Link'
import sh from '../../../shared/ui/shared.module.css'
import type { Me } from '../../auth/model'
import type { PackArt } from '../../catalog/model'
import { openedCountText, quotaText, refillText, type FailureText } from '../model'
import { PackPreview } from './PackPreview'
import s from './packs.module.css'

/** Início (§7.1): booster, contador, hora da recarga. Sem pacotes o booster apaga e o botão espera. */
export function HomeView({
  me,
  art,
  logo,
  failure,
  onRetry,
}: {
  me: Me | null
  art: PackArt | null
  logo: HTMLImageElement | null
  failure: FailureText | null
  onRetry: () => void
}) {
  const none = me !== null && me.packs_available <= 0
  return (
    <main className={`${sh.screen} ${s.home}`}>
      <header className={`${sh.header} ${s.head}`}>
        <h1>{me ? `Olá, ${me.name}` : 'Olá'}</h1>
        <span className={sh.muted}>{me ? openedCountText(me.total_packs) : ''}</span>
      </header>
      {none ? (
        <div className={s.packWrap}>
          <PackPreview art={art} logo={logo} dimmed />
        </div>
      ) : (
        <Link to={PATHS.open} className={s.packWrap} aria-label="Abrir pacote">
          <PackPreview art={art} logo={logo} dimmed={false} />
        </Link>
      )}
      {failure ? (
        <div className={s.failure} role="alert">
          <b>{failure.title}</b>
          <p>{failure.detail}</p>
          {failure.retry && (
            <button type="button" className={sh.btn} onClick={onRetry}>
              Tentar de novo
            </button>
          )}
        </div>
      ) : (
        <>
          <p className={s.quota}>{me ? quotaText(me.packs_available) : '…'}</p>
          <p className={sh.muted}>{me ? refillText(me.next_refill_at, me.packs_available) : ''}</p>
          {none ? (
            <button type="button" className={sh.btn} disabled>
              Volta mais tarde
            </button>
          ) : (
            <Link className={sh.btn} to={PATHS.open}>
              Abrir pacote
            </Link>
          )}
        </>
      )}
    </main>
  )
}
