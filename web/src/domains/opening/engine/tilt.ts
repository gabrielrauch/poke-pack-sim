import { CARD_LOOK, type CardLook } from './look'

/**
 * Tilt e paralaxe (§8.2): alvo em [-1, 1] seguido por uma mola amortecida (`vx`/`vy` por segundo), que
 * passa um pouco do alvo e volta, como carta de verdade. Mutável de propósito (zero alocação no loop).
 */
export type Tilt = { x: number; y: number; tx: number; ty: number; vx: number; vy: number }

export const TILT_DIVISOR = 22
export const TILT_BETA_REST = 45
/** Giro máximo (graus) da carta em foco com o tilt em ±1 (x vem de `ty`, y de `tx`). Abertura e álbum usam este. */
export const FOCUS_TILT_DEG = CARD_LOOK.tiltDeg
/** Giro máximo (graus) do pacote fechado. */
export const PACK_TILT_DEG = { x: 7, y: 9 } as const
/** Passo máximo da mola (s): um frame longo (troca de aba) não pode explodir a integração. */
const MAX_STEP = 1 / 30
const EPS = 1e-3

const clamp = (v: number) => Math.max(-1, Math.min(1, v))

export function createTilt(): Tilt {
  return { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0 }
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

/**
 * Um passo da mola (Euler semi-implícito) de `dtMs`; `true` enquanto ainda se move (mantém o loop
 * ligado). Parada: perto do alvo e quase sem velocidade, então encaixa no alvo.
 */
export function updateTilt(
  t: Tilt,
  dtMs = 1000 / 60,
  spring: CardLook['spring'] = CARD_LOOK.spring,
): boolean {
  const dt = Math.min(Math.max(dtMs, 0) / 1000, MAX_STEP)
  t.vx += (spring.stiffness * (t.tx - t.x) - spring.damping * t.vx) * dt
  t.vy += (spring.stiffness * (t.ty - t.y) - spring.damping * t.vy) * dt
  t.x += t.vx * dt
  t.y += t.vy * dt
  const moving =
    Math.abs(t.tx - t.x) > EPS ||
    Math.abs(t.ty - t.y) > EPS ||
    Math.abs(t.vx) > EPS ||
    Math.abs(t.vy) > EPS
  if (!moving) {
    t.x = t.tx
    t.y = t.ty
    t.vx = 0
    t.vy = 0
  }
  return moving
}
