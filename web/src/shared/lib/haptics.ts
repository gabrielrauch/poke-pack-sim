/** `navigator.vibrate` só existe no Android e só responde depois do primeiro toque; no iOS é no-op. */
export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // sem vibração: nada a fazer
  }
}
