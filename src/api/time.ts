const HOUR = 3_600_000

/**
 * Início da janela de recarga que contém `now`, como ISO: janelas de `hours` horas alinhadas à época
 * UTC. Com São Paulo em UTC-3 (sem horário de verão) e 3 h, as janelas caem em 00:00, 03:00… locais.
 */
export function refillPeriod(now: Date, hours: number): string {
  const ms = hours * HOUR
  return new Date(Math.floor(now.getTime() / ms) * ms).toISOString()
}

/** Instante em que a próxima janela começa (`next_refill_at`). */
export function nextRefillAt(now: Date, hours: number): Date {
  const ms = hours * HOUR
  return new Date((Math.floor(now.getTime() / ms) + 1) * ms)
}
