import { isHit } from '../catalog/model'
import type { PackCard } from '../packs/model'
import type { State } from './engine/sequence'

export const HINT_TEAR = 'Arraste pelo topo para rasgar'

/** Texto do rodapé por estado; `revealed` é quantas cartas já viraram. */
export function hintFor(state: State, revealed: number, total: number): string {
  if (state === 'pack' || state === 'tearing') return HINT_TEAR
  if (state === 'card') {
    return revealed >= total
      ? 'Deslize para o lado para terminar'
      : 'Deslize para o lado para a próxima'
  }
  return ''
}

/** Grade do resumo estilo TCG Pocket: 3 por linha; a última linha fica centralizada pelo CSS. */
export const SUMMARY_COLUMNS = 3

export function summaryTitle(cards: readonly PackCard[]): string {
  return cards.some((c) => isHit(c.tier)) ? 'Que puxada!' : 'Pacote aberto'
}

export function summarySubtitle(cards: readonly PackCard[]): string {
  const n = cards.filter((c) => c.new).length
  return n === 1 ? '1 carta nova para o álbum' : `${n} cartas novas para o álbum`
}

export const HINT_PREPARING = 'Preparando o pacote…'

/** Rodapé do fallback sem WebGL: `revealed` cartas já mostradas (0 = pacote fechado). */
export function fallbackHint(revealed: number, total: number, ready: boolean): string {
  if (!ready) return HINT_PREPARING
  if (revealed === 0) return 'Toque para abrir'
  return revealed >= total ? 'Toque para terminar' : 'Toque para a próxima'
}
