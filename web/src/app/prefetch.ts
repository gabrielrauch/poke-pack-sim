/** Da Home, o chunk da abertura (three + engine) baixa em idle (§8.11); Safari não tem requestIdleCallback. */
export function prefetchOpening(): void {
  const run = () => {
    void import('../domains/opening/ui/OpenScreen')
  }
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 1500)
}
