import { useCallback, useMemo, useState } from 'react'
import { PATHS } from '../../../shared/lib/router'
import { hasWebGL2 } from '../../../shared/lib/webgl'
import { Link } from '../../../shared/ui/Link'
import { useCatalog } from '../../catalog/hooks'
import { DEFAULT_SET, packArt } from '../../catalog/model'
import { useOpenPack } from '../../packs/hooks'
import {
  againLabel,
  classifyOpenError,
  newPackId,
  openFailureText,
  packsLeftText,
  type FailureText,
} from '../../packs/model'
import { FallbackStage } from './FallbackStage'
import s from './opening.module.css'
import { OpeningStage } from './OpeningStage'
import { Summary } from './Summary'

/** Só em dev: `/abrir?fallback=1` força o caminho sem WebGL. */
const forceFallback = () =>
  import.meta.env.DEV && new URLSearchParams(window.location.search).get('fallback') === '1'

/**
 * Tela de abertura (§7.1, §10.6). O `POST /api/packs` roda enquanto o pacote fechado já está na tela;
 * `pack_id` nasce aqui e é reutilizado na retentativa (§7.2).
 */
export default function OpenScreen() {
  const [packId, setPackId] = useState(newPackId)
  const [finished, setFinished] = useState(false)
  const catalog = useCatalog(DEFAULT_SET)
  const opened = useOpenPack(DEFAULT_SET, packId)
  const webgl = useMemo(() => !forceFallback() && hasWebGL2(), [])
  // Memo por primitivos: um refetch do catálogo não pode gerar outro objeto `art` (isso re-apresentaria o pacote no meio da sequência).
  const setName = catalog.data?.name
  const setLogo = catalog.data?.logo ?? null
  const art = useMemo(
    () => (setName !== undefined ? packArt({ name: setName, logo: setLogo }) : null),
    [setName, setLogo],
  )
  const pack = opened.data?.cards ?? null
  const onFinished = useCallback(() => setFinished(true), [])
  const again = useCallback(() => {
    setFinished(false)
    setPackId(newPackId())
  }, [])

  const error = opened.error ?? catalog.error
  const failure = error ? openFailureText(classifyOpenError(error)) : null
  const retry = () => {
    if (opened.error) void opened.refetch()
    else void catalog.refetch()
  }

  return (
    <div className={s.stage}>
      <header className={s.top}>
        <Link className={s.link} to={PATHS.home}>
          ‹ Início
        </Link>
        <b>{art?.name ?? ''}</b>
        <span>{opened.data ? packsLeftText(opened.data.packs_available) : ''}</span>
      </header>
      {webgl ? (
        <OpeningStage session={packId} pack={pack} art={art} onFinished={onFinished} />
      ) : (
        <FallbackStage session={packId} pack={pack} onFinished={onFinished} />
      )}
      {failure && <StatusOverlay text={failure} onRetry={retry} />}
      {finished && opened.data && (
        <Summary
          cards={opened.data.cards}
          onAgain={again}
          againLabel={againLabel(opened.data.packs_available)}
          againDisabled={opened.data.packs_available <= 0}
        >
          <Link className={s.link} to={PATHS.album}>
            Ver no álbum
          </Link>
        </Summary>
      )}
    </div>
  )
}

function StatusOverlay({ text, onRetry }: { text: FailureText; onRetry: () => void }) {
  return (
    <div className={s.status} role="alert">
      <div className={s.statusCard}>
        <b>{text.title}</b>
        <p>{text.detail}</p>
        {text.retry ? (
          <button type="button" className={s.btn} onClick={onRetry}>
            Tentar de novo
          </button>
        ) : (
          <Link className={s.btn} to={PATHS.home}>
            Voltar ao início
          </Link>
        )}
      </div>
    </div>
  )
}
