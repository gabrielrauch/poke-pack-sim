/** Tilt e paralaxe (§8.2): alvo em [-1, 1], lerp 0,1 por frame. Mutável de propósito (zero alocação no loop). */
export type Tilt = { x: number; y: number; tx: number; ty: number }

export const TILT_LERP = 0.1
export const TILT_DIVISOR = 22
export const TILT_BETA_REST = 45
const EPS = 1e-3

const clamp = (v: number) => Math.max(-1, Math.min(1, v))

export function createTilt(): Tilt {
  return { x: 0, y: 0, tx: 0, ty: 0 }
}

export function setTiltTarget(t: Tilt, px: number, py: number): void {
  t.tx = clamp(px)
  t.ty = clamp(py)
}

/** `deviceorientation`: gamma/22, (beta-45)/22 (45° é a inclinação natural de segurar o celular). */
export function tiltFromOrientation(gamma: number, beta: number): [number, number] {
  return [clamp(gamma / TILT_DIVISOR), clamp((beta - TILT_BETA_REST) / TILT_DIVISOR)]
}

/** Sem sensor: mouse relativo ao centro do retângulo da cena. */
export function tiltFromPointer(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number },
): [number, number] {
  return [
    clamp(((x - rect.left) / rect.width - 0.5) * 2),
    clamp(((y - rect.top) / rect.height - 0.5) * 2),
  ]
}

/** Um passo do lerp; `true` enquanto ainda se move (mantém o loop ligado). */
export function updateTilt(t: Tilt): boolean {
  t.x += (t.tx - t.x) * TILT_LERP
  t.y += (t.ty - t.y) * TILT_LERP
  const moving = Math.abs(t.tx - t.x) > EPS || Math.abs(t.ty - t.y) > EPS
  if (!moving) {
    t.x = t.tx
    t.y = t.ty
  }
  return moving
}
