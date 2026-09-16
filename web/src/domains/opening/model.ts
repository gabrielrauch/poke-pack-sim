import { isHit } from '../catalog/model'
import type { PackCard } from '../packs/model'
import type { State } from './engine/sequence'

export const HINT_TEAR = 'Arraste pelo topo para rasgar'

/** Texto do rodapé por estado; `revealed` é quantas cartas já viraram. */
export function hintFor(state: State, revealed: number, total: number): string {
  if (state === 'pack' || state === 'tearing') return HINT_TEAR
  if (state === 'card') {
    return revealed >= total
      ? 'Deslize para cima para terminar'
      : 'Deslize para cima para a próxima'
  }
  return ''
}

/** §8.10: `translate(k*34px, |k|*9px) rotate(k*9deg)` com k = i - 2. */
export function fanTransform(i: number, total = 5): string {
  const k = i - Math.floor(total / 2)
  return `translate(${k * 34}px, ${Math.abs(k) * 9}px) rotate(${k * 9}deg)`
}

export function summaryTitle(cards: readonly PackCard[]): string {
  return cards.some((c) => isHit(c.tier)) ? 'Que puxada!' : 'Pacote aberto'
}

export function summarySubtitle(cards: readonly PackCard[]): string {
  const n = cards.filter((c) => c.new).length
  return n === 1 ? '1 carta nova para o álbum' : `${n} cartas novas para o álbum`
}
