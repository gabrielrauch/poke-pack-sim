/** Gesto do corte (§8.4). Puro: a cena e o hook só passam frações e px. */
export type Tear = {
  active: boolean
  /** Progresso monotônico 0..1. */
  p: number
  dir: -1 | 0 | 1
  /** Extremos da linha de luz, em fração da largura do pacote. */
  a: number
  b: number
}
export type Rect = { left: number; top: number; width: number; height: number }

export const TEAR_ZONE = 0.24
export const TEAR_PAD = 14
export const TEAR_GAIN = 1.15
export const TEAR_DIR_DEADZONE = 4
export const TEAR_COMPLETE_DRAG = 0.98
export const TEAR_COMPLETE_RELEASE = 0.7

export function onPack(rect: Rect, x: number, y: number): boolean {
  return (
    x >= rect.left - TEAR_PAD &&
    x <= rect.left + rect.width + TEAR_PAD &&
    y >= rect.top - TEAR_PAD &&
    y <= rect.top + rect.height + TEAR_PAD
  )
}

export function inTearZone(rect: Rect, x: number, y: number): boolean {
  return onPack(rect, x, y) && y <= rect.top + rect.height * TEAR_ZONE + TEAR_PAD
}

export function tearBegin(xFrac: number): Tear {
  return { active: true, p: 0, dir: 0, a: xFrac, b: xFrac }
}

/** `dx` em px desde o toque, `width` = largura projetada do pacote em px. */
export function tearMove(
  t: Tear,
  xFrac: number,
  dx: number,
  width: number,
): { tear: Tear; milestone: boolean; complete: boolean } {
  let dir = t.dir
  if (dir === 0 && Math.abs(dx) > TEAR_DIR_DEADZONE) dir = dx > 0 ? 1 : -1
  const p = Math.min(1, Math.max(t.p, (Math.abs(dx) / width) * TEAR_GAIN))
  const a = dir < 0 ? Math.min(t.a, xFrac) : t.a
  const b = dir > 0 ? Math.max(t.b, xFrac) : t.b
  const milestone = Math.floor(p * 10) > Math.floor(t.p * 10)
  const complete = p >= TEAR_COMPLETE_DRAG
  return { tear: { active: !complete, p, dir, a, b }, milestone, complete }
}

export function tearRelease(t: Tear): 'complete' | 'reset' {
  return t.p >= TEAR_COMPLETE_RELEASE ? 'complete' : 'reset'
}
