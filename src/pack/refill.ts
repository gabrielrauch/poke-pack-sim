export type Allowance = { amount: number; hours: number; cap: number }
export type RefillState = { packsAvailable: number; lastRefillDate: string | null }

/**
 * Recarga preguiçosa, sem cron: uma vez por janela de `hours` horas. `period` identifica a janela
 * atual (ISO do instante em que ela começa; ordem lexicográfica = cronológica) e fica gravado em
 * `users.last_refill_date`. Devolve o mesmo objeto quando nada muda.
 */
export function applyRefill(state: RefillState, period: string, allowance: Allowance): RefillState {
  if (state.lastRefillDate !== null && period <= state.lastRefillDate) return state
  return {
    packsAvailable: Math.min(allowance.cap, state.packsAvailable + allowance.amount),
    lastRefillDate: period,
  }
}
