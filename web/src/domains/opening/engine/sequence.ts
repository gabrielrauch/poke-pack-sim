import { EASE, MS, type Bezier } from '../../../shared/lib/motion'
import { isHit } from '../../catalog/model'
import type { PackCard } from '../../packs/model'
import type { Frame } from './tween'

/** §8.1: pack → tearing → opening → card ⇄ anim → summary. `anim` é o "busy" que bloqueia entrada. */
export type State = 'pack' | 'tearing' | 'opening' | 'card' | 'anim' | 'summary'
export type Event =
  | 'tearStart'
  | 'tearCancel'
  | 'tearComplete'
  | 'opened'
  | 'revealed'
  | 'next'
  | 'finished'
  | 'again'

const TRANSITIONS: Record<State, Partial<Record<Event, State>>> = {
  pack: { tearStart: 'tearing', tearComplete: 'opening' },
  tearing: { tearCancel: 'pack', tearComplete: 'opening' },
  opening: { opened: 'anim' },
  anim: { revealed: 'card', finished: 'summary' },
  card: { next: 'anim' },
  summary: { again: 'pack' },
}

/** `null` quando o evento não vale no estado (a cena ignora). */
export function transition(state: State, event: Event): State | null {
  return TRANSITIONS[state][event] ?? null
}

export type Step = { at: number; duration: number; easing: Bezier }

/** Linha do tempo do §8.5 (ms desde o fim do corte). */
export const OPENING = {
  flash: { at: 0, duration: MS.flash, easing: EASE.linear },
  recoil: { at: 0, duration: MS.recoil, easing: EASE.linear },
  strip: { at: 0, duration: MS.stripJump, easing: EASE.stripJump },
  cutOff: { at: 140, duration: MS.cutFade, easing: EASE.linear },
  rise: { at: 140, duration: MS.stackRise, easing: EASE.stackRise },
  fall: { at: 440, duration: MS.bodyFall, easing: EASE.bodyFall },
  settle: { at: 710, duration: MS.stackSettle, easing: EASE.stackSettle },
  packGone: { at: 1310, duration: 0, easing: EASE.linear },
} as const satisfies Record<string, Step>
export const OPENING_END = OPENING.settle.at + OPENING.settle.duration

/* Números do §8.5 já na convenção do Three (y para cima, rotação anti-horária positiva). */
/** Tira: `translateY(-22px) rotate(-3deg*dir)` aos 22%, depois `translate(70px*dir, -320px) rotate(26deg*dir)`. */
export const STRIP_JUMP = { lift: 22, tilt: 3, drift: 70, rise: 320, spin: -26 } as const
/** Corpo recua: scale 1 → .965 (35%) → 1.02 (70%) → 1. */
export const RECOIL = [
  { at: 0, s: 1 },
  { at: 0.35, s: 0.965 },
  { at: 0.7, s: 1.02 },
  { at: 1, s: 1 },
] as const
/** Pilha: começa em scale .8 atrás do corpo, sobe 36% da altura da carta em scale .9, depois assenta no centro. */
export const STACK = { hiddenScale: 0.8, riseScale: 0.9, riseY: 0.36 } as const
/** Corpo cai 70% da própria altura girando 5° (CSS rotate(5deg) → -5). */
export const FALL = { y: 0.7, rotate: -5 } as const
/** Entrada do pacote (§8.10): translateY(40px) scale(.8) → normal. */
export const PACK_ENTER = { y: -40, scale: 0.8 } as const
/** Toque fora da tira: rotate 0 → -2.5° → 2.5° → 0 em 340 ms (já em graus de Three). */
export const NUDGE = [
  { at: 0, rz: 0 },
  { at: 0.33, rz: 2.5 },
  { at: 0.66, rz: -2.5 },
  { at: 1, rz: 0 },
] as const

/** §8.6: offsets 0/45/80/100 → translateY (já invertido), rotateY em graus, scale. */
export const FLIP = [
  { at: 0, y: 0, ry: 0, s: 1 },
  { at: 0.45, y: 34, ry: 90, s: 1.06 },
  { at: 0.8, y: 10, ry: 180, s: 1.05 },
  { at: 1, y: 0, ry: 180, s: 1 },
] as const
/** Momento em que a face aparece: burst do hit e vibração das raras. */
export const FLIP_FACE_AT = 0.45
/** Descarte: `translateY(-110%) scale(.7)`, opacity 0. */
export const DISCARD = { y: 1.1, scale: 0.7 } as const
/** Badge "Nova": scale(0) rotate(-10deg) → normal (rotate já invertido). */
export const BADGE_POP = { rz: 10 } as const
/** Tremida do suspense (§8.7), px em x, entre 30% e 80% da carga de 1,4 s. */
export const CHARGE_SHAKE = [
  { at: 0, x: 0 },
  { at: 0.3, x: -2 },
  { at: 0.4, x: 2 },
  { at: 0.5, x: -3 },
  { at: 0.6, x: 3 },
  { at: 0.7, x: -2 },
  { at: 0.8, x: 2 },
  { at: 1, x: 0 },
] as const
export const CHARGE = {
  scale: 1.04,
  glowFrom: 1.2,
  glowTo: 2.6,
  glowOpacity: 0.75,
  backBoost: 1.3,
} as const
export const DIM = { opacity: 0.66, others: 0.55 } as const

const rad = (deg: number) => (deg * Math.PI) / 180

/** Pose do verso de profundidade `k` na pilha (0 = topo): translateY(4px*k) rotate(±0.8deg*k). */
export function stackPose(k: number): { y: number; rz: number } {
  return { y: -4 * k || 0, rz: -((k % 2 ? 1 : -1) * k * 0.8) || 0 }
}

export type Reveal = {
  index: number
  hit: boolean
  suspense: boolean
  flipMs: number
  buzz: boolean
}

/** Um plano por carta: o slot raro é o último; suspense só quando a última é hit. */
export function revealPlan(cards: readonly PackCard[]): Reveal[] {
  return cards.map((card, index) => {
    const hit = isHit(card.tier)
    const last = index === cards.length - 1
    return {
      index,
      hit,
      suspense: last && hit,
      flipMs: hit ? MS.flipHit : MS.flip,
      buzz: !hit && card.tier !== 'common' && card.tier !== 'uncommon',
    }
  })
}

/** Os quadros do flip prontos para `Tweens.keyframes` (rotação em radianos). */
export function flipFrames(): {
  position: Frame<{ y: number }>[]
  rotation: Frame<{ y: number }>[]
  scale: Frame<{ x: number; y: number }>[]
} {
  return {
    position: FLIP.map((f) => ({ at: f.at, to: { y: f.y } })),
    rotation: FLIP.map((f) => ({ at: f.at, to: { y: rad(f.ry) } })),
    scale: FLIP.map((f) => ({ at: f.at, to: { x: f.s, y: f.s } })),
  }
}
