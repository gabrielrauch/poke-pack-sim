export type Allowance = { daily: number; cap: number }
export type RefillState = { packsAvailable: number; lastRefillDate: string | null }

/**
 * Recarga preguiçosa, sem cron: uma vez por dia. `today` é `YYYY-MM-DD` no fuso da usuária,
 * comparado como string (ordem lexicográfica = cronológica). Devolve o mesmo objeto quando nada muda.
 */
export function applyRefill(state: RefillState, today: string, allowance: Allowance): RefillState {
  if (state.lastRefillDate !== null && today <= state.lastRefillDate) return state
  return {
    packsAvailable: Math.min(allowance.cap, state.packsAvailable + allowance.daily),
    lastRefillDate: today,
  }
}
