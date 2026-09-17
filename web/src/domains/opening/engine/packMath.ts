import { MS } from '../../../shared/lib/motion'

export const PACK_ASPECT = 1.62
/** A tira ocupa os 21% do topo. */
export const STRIP_FRAC = 0.21

/** Volume da frente (fração da largura): 0 nas costuras (topo/fundo) e nas laterais, máximo no centro. */
export const PUFF = 0.07
export const SEAL_TOP = 0.05
export const SEAL_BOTTOM = 0.95

/**
 * Altura z da frente em (u, v) ∈ [0,1]² (v para baixo), em fração da largura. Um travesseiro achatado:
 * raiz em u para ombros redondos, expoente < 1 em v para um platô longo entre as costuras.
 */
export function packZ(u: number, v: number): number {
  const t = (v - SEAL_TOP) / (SEAL_BOTTOM - SEAL_TOP)
  if (t <= 0 || t >= 1 || u <= 0 || u >= 1) return 0
  return PUFF * Math.sqrt(Math.sin(Math.PI * u)) * Math.sin(Math.PI * t) ** 0.7
}

/** PRNG determinístico (mulberry32) para a arte procedural: o mesmo pacote sai sempre igual. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Costuras (topo da tira, fundo do corpo): corte quase reto com micro-serrilhado, como no booster real. */
export const SEAL_TEETH = 60
/** Profundidade dos dentes da costura, em fração da altura do pacote. */
export const SEAL_DEPTH = 0.012
/** Rasgo (§8.5): dentes grossos. */
export const TEAR_TEETH = 18
/** Pontos (x, y) em fração 0..1, y para baixo como no canvas. */
export type Outline = Array<[number, number]>

/** Corpo: boca rasgada entre 18% e 21% no topo (§8.3) e costura fina embaixo. */
export function bodyOutline(): Outline {
  const pts: Outline = []
  for (let i = 0; i <= TEAR_TEETH; i++) pts.push([i / TEAR_TEETH, i % 2 ? 0.21 : 0.18])
  for (let i = SEAL_TEETH; i >= 0; i--) pts.push([i / SEAL_TEETH, i % 2 ? 1 - SEAL_DEPTH : 1])
  return pts
}

/** Tira: costura fina no topo (em fração da própria altura); embaixo reta, ou rasgada entre 84% e 100% (§8.5). */
export function stripOutline(torn: boolean): Outline {
  const pts: Outline = []
  const d = SEAL_DEPTH / STRIP_FRAC
  for (let i = 0; i <= SEAL_TEETH; i++) pts.push([i / SEAL_TEETH, i % 2 ? 0 : d])
  if (torn) for (let i = TEAR_TEETH; i >= 0; i--) pts.push([i / TEAR_TEETH, i % 2 ? 0.84 : 1])
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
