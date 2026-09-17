import { useEffect } from 'react'
import { PATHS } from '../../../shared/lib/router'
import { Link } from '../../../shared/ui/Link'
import sh from '../../../shared/ui/shared.module.css'
import { useHistory } from '../hooks'
import { findPack } from '../model'
import { PackView } from './PackView'

/** Reabertura lê o histórico (o pacote está em `packs.cards`), página a página até achar o id. */
export default function PackScreen({ id }: { id: string }) {
  const q = useHistory()
  const pack = findPack(q.data?.pages, id)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q
  useEffect(() => {
    if (!pack && hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [pack, hasNextPage, isFetchingNextPage, fetchNextPage])
  if (pack) return <PackView pack={pack} />
  const searching = q.isPending || hasNextPage || isFetchingNextPage
  return (
    <main className={sh.screen}>
      <p className={sh.note}>{searching ? 'Carregando…' : 'Pacote não encontrado.'}</p>
      {!searching && (
        <p style={{ textAlign: 'center' }}>
          <Link className={sh.btn} to={PATHS.history}>
            Ver o histórico
          </Link>
        </p>
      )}
    </main>
  )
}
