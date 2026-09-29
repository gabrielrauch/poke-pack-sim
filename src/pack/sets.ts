/** Set que dá para abrir no app. `name` é o nome em pt-BR, para o seletor não depender do catálogo. */
export type SetInfo = { id: string; name: string }

/**
 * Sets liberados, na ordem do seletor. Todos usam a recipe `sv`, então só entram sets cujos tiers
 * cabem nela (sem ACE SPEC, brilhantes ou Preto e Branco, que a recipe não sorteia).
 * Conferir contra o TCGdex: `CHECK_SETS=1 pnpm vitest run src/provider/sets.live.test.ts`.
 */
export const SETS: readonly SetInfo[] = [
  { id: 'sv03.5', name: '151' },
  { id: 'sv01', name: 'Escarlate e Violeta' },
  { id: 'sv02', name: 'Evoluções em Paldea' },
  { id: 'sv03', name: 'Chamas Obsidianas' },
  { id: 'sv04', name: 'Fenda Paradoxal' },
]

/** Primeiro set da lista; é o que o app abre sem escolha salva. */
export const DEFAULT_SET_ID = SETS[0]!.id

const BY_ID = new Map(SETS.map((set) => [set.id, set]))

/** `null` para set fora da lista: o Worker responde 404 antes de mexer na cota. */
export function setInfo(setId: string): SetInfo | null {
  return BY_ID.get(setId) ?? null
}
