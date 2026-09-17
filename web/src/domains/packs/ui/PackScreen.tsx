import { PATHS } from '../../../shared/lib/router'
import { Link } from '../../../shared/ui/Link'
import sh from '../../../shared/ui/shared.module.css'
import { useHistory } from '../hooks'
import { findPack } from '../model'
import { PackView } from './PackView'

/** Reabertura lê a página do histórico já carregada (o pacote está em `packs.cards`). */
export default function PackScreen({ id }: { id: string }) {
  const q = useHistory()
  const pack = findPack(q.data?.pages, id)
  if (pack) return <PackView pack={pack} />
  return (
    <main className={sh.screen}>
      <p className={sh.note}>{q.isPending ? 'Carregando…' : 'Pacote não encontrado.'}</p>
      {!q.isPending && (
        <p style={{ textAlign: 'center' }}>
          <Link className={sh.btn} to={PATHS.history}>
            Ver o histórico
          </Link>
        </p>
      )}
    </main>
  )
}
