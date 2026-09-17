import sh from '../../../shared/ui/shared.module.css'
import { useHistory } from '../hooks'
import { historyPacks } from '../model'
import { HistoryView } from './HistoryView'

export default function HistoryScreen() {
  const q = useHistory()
  const packs = historyPacks(q.data?.pages)
  if (q.isError && packs.length === 0) {
    return (
      <main className={sh.screen}>
        <p className={sh.note}>Não deu para carregar o histórico. Tenta de novo com internet.</p>
      </main>
    )
  }
  return (
    <HistoryView
      packs={packs}
      hasMore={q.hasNextPage}
      onMore={() => void q.fetchNextPage()}
      loadingMore={q.isFetchingNextPage}
      empty={q.isSuccess && packs.length === 0}
    />
  )
}
