import { MS } from '../../../shared/lib/motion'

export const TEETH = 18
/** Pontos (x, y) em fração 0..1, y para baixo como no canvas. */
export type Outline = Array<[number, number]>

/** Corpo: dentes entre 18% e 21% no topo e entre 97% e 100% embaixo (§8.3). */
export function bodyOutline(): Outline {
  const pts: Outline = []
  for (let i = 0; i <= TEETH; i++) pts.push([i / TEETH, i % 2 ? 0.21 : 0.18])
  for (let i = TEETH; i >= 0; i--) pts.push([i / TEETH, i % 2 ? 0.97 : 1])
  return pts
}

/** Tira: dentes entre 0 e 12% da própria altura; embaixo reta, ou rasgada entre 84% e 100% (§8.5). */
export function stripOutline(torn: boolean): Outline {
  const pts: Outline = []
  for (let i = 0; i <= TEETH; i++) pts.push([i / TEETH, i % 2 ? 0 : 0.12])
  if (torn) for (let i = TEETH; i >= 0; i--) pts.push([i / TEETH, i % 2 ? 0.84 : 1])
  else pts.push([1, 1], [0, 1])
  return pts
}

const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t)

/** Varredura de brilho (§8.3): ciclo de 4,6 s, parada até 58%, anda até 88%; 0..1 com ease-in-out. */
export function sweepPhase(now: number): number {
  const u = (now % MS.sweep) / MS.sweep
  if (u < 0.58) return 0
  if (u >= 0.88) return 1
  return easeInOut((u - 0.58) / 0.3)
}

/** Guia da tira (§8.3): 2,4 s; anda entre 12% e 88%; opacidade sobe 12→20% e cai 80→88%. */
export function guidePhase(now: number): { x: number; opacity: number } {
  const u = (now % MS.guide) / MS.guide
  const x = u < 0.12 ? 0 : u >= 0.88 ? 1 : easeInOut((u - 0.12) / 0.76)
  const opacity =
    u < 0.12 ? 0 : u < 0.2 ? (u - 0.12) / 0.08 : u < 0.8 ? 1 : u < 0.88 ? (0.88 - u) / 0.08 : 0
  return { x, opacity }
}
