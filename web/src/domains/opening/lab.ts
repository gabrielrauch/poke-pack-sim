import { proxiedImage, type PackArt, type Tier } from '../catalog/model'
import type { PackCard } from '../packs/model'
import { holoPreset } from './engine/holo.glsl'
import { CARD_LOOK, mergeLook, type CardLook } from './engine/look'

const IMG = 'https://assets.tcgdex.net/pt/sv/sv03.5'

const card = (n: string, name: string, tier: Tier, reverse = false, isNew = true): PackCard => ({
  n,
  name,
  tier,
  reverse,
  img: `${IMG}/${n}`,
  new: isNew,
})

export type LabTier =
  | 'rare'
  | 'holo'
  | 'double_rare'
  | 'illustration_rare'
  | 'ultra_rare'
  | 'special_illustration_rare'
  | 'hyper_rare'

/** Uma carta real do 151 por tier (o set não tem `holo`: usa uma rara para ver o preset). */
const LAST: Record<LabTier, PackCard> = {
  rare: card('015', 'Beedrill', 'rare'),
  holo: card('045', 'Vileplume', 'holo'),
  double_rare: card('006', 'Charizard ex', 'double_rare'),
  illustration_rare: card('168', 'Charmander', 'illustration_rare'),
  ultra_rare: card('183', 'Charizard ex', 'ultra_rare'),
  special_illustration_rare: card('199', 'Charizard ex', 'special_illustration_rare'),
  hyper_rare: card('205', 'Mew ex', 'hyper_rare'),
}

export const LAB_TIERS = Object.keys(LAST) as LabTier[]
export const LAB_ART: PackArt = {
  name: '151',
  subtitle: '5 cartas',
  logo: proxiedImage(`${IMG}/logo.png`),
}

/** Dados falsos com imagens reais: 3 comuns/incomuns, 1 reverse, o slot raro por último. */
export function labPack(last: LabTier): PackCard[] {
  return [
    card('001', 'Bulbasaur', 'common'),
    card('002', 'Ivysaur', 'uncommon', false, false),
    card('007', 'Squirtle', 'common'),
    card('026', 'Raichu', 'rare', true),
    LAST[last],
  ]
}

/** `/lab?bancada` abre a bancada de material em vez da abertura. */
export function labBenchFromUrl(search: string): boolean {
  return new URLSearchParams(search).has('bancada')
}

export function labTierFromUrl(search: string): LabTier {
  const t = new URLSearchParams(search).get('tier')
  return t && (LAB_TIERS as string[]).includes(t) ? (t as LabTier) : 'special_illustration_rare'
}

/* ---------- bancada de material (fase 1) ---------- */

/** Cartas da bancada: uma comum, a reverse do pacote falso e a do slot raro de cada tier. */
export const BENCH_CARDS: readonly PackCard[] = [
  card('001', 'Bulbasaur', 'common'),
  card('026', 'Raichu', 'rare', true),
  ...LAB_TIERS.map((t) => LAST[t]),
]

export type BenchKey =
  | 'thickness'
  | 'sheen'
  | 'shininess'
  | 'shade'
  | 'rim'
  | 'shadowOpacity'
  | 'tiltX'
  | 'tiltY'
  | 'stiffness'
  | 'damping'
  | 'foil'
  | 'edgeStrength'
  | 'sparkle'
  | 'gold'

export type BenchSlider = {
  key: BenchKey
  label: string
  min: number
  max: number
  step: number
  /** `look` mexe no corpo e na luz (todas as cartas); `finish` no preset holo da carta escolhida. */
  group: 'look' | 'finish'
}

export const BENCH_SLIDERS: readonly BenchSlider[] = [
  { key: 'thickness', label: 'Espessura', min: 0, max: 0.04, step: 0.001, group: 'look' },
  { key: 'sheen', label: 'Brilho da luz', min: 0, max: 0.8, step: 0.01, group: 'look' },
  { key: 'shininess', label: 'Dureza do brilho', min: 2, max: 200, step: 1, group: 'look' },
  { key: 'shade', label: 'Sombreamento', min: 0, max: 0.6, step: 0.01, group: 'look' },
  { key: 'rim', label: 'Verniz de raspão', min: 0, max: 0.6, step: 0.01, group: 'look' },
  { key: 'shadowOpacity', label: 'Sombra', min: 0, max: 1, step: 0.01, group: 'look' },
  { key: 'tiltX', label: 'Giro vertical (°)', min: 0, max: 30, step: 0.5, group: 'look' },
  { key: 'tiltY', label: 'Giro horizontal (°)', min: 0, max: 30, step: 0.5, group: 'look' },
  { key: 'stiffness', label: 'Mola: rigidez', min: 20, max: 400, step: 1, group: 'look' },
  { key: 'damping', label: 'Mola: amortecimento', min: 2, max: 60, step: 0.5, group: 'look' },
  { key: 'foil', label: 'Foil', min: 0, max: 1, step: 0.01, group: 'finish' },
  { key: 'edgeStrength', label: 'Filete', min: 0, max: 1, step: 0.01, group: 'finish' },
  { key: 'sparkle', label: 'Glitter', min: 0, max: 1, step: 0.01, group: 'finish' },
  { key: 'gold', label: 'Ouro', min: 0, max: 1, step: 0.01, group: 'finish' },
]

type BenchFinish = Record<'foil' | 'edgeStrength' | 'sparkle' | 'gold', number>

/** Valor atual de um controle, lido do look e do preset (com o que a bancada já mudou por cima). */
export function benchValue(look: CardLook, finish: BenchFinish, key: BenchKey): number {
  switch (key) {
    case 'tiltX':
      return look.tiltDeg.x
    case 'tiltY':
      return look.tiltDeg.y
    case 'stiffness':
      return look.spring.stiffness
    case 'damping':
      return look.spring.damping
    case 'foil':
    case 'edgeStrength':
    case 'sparkle':
    case 'gold':
      return finish[key]
    default:
      return look[key]
  }
}

/** Um controle mexido: devolve o look novo (imutável, para o React) ou o patch do preset. */
export function withBenchValue(look: CardLook, key: BenchKey, value: number): CardLook {
  switch (key) {
    case 'tiltX':
      return mergeLook(look, { tiltDeg: { ...look.tiltDeg, x: value } })
    case 'tiltY':
      return mergeLook(look, { tiltDeg: { ...look.tiltDeg, y: value } })
    case 'stiffness':
      return mergeLook(look, { spring: { ...look.spring, stiffness: value } })
    case 'damping':
      return mergeLook(look, { spring: { ...look.spring, damping: value } })
    case 'foil':
    case 'edgeStrength':
    case 'sparkle':
    case 'gold':
      return look
    default:
      return mergeLook(look, { [key]: value })
  }
}

/** O texto do "Copiar valores": só o que difere do código, pronto para colar num PR ou numa mensagem. */
export function benchExport(look: CardLook, card: PackCard, finish: Partial<BenchFinish>): string {
  const lookDiff: Record<string, unknown> = {}
  for (const key of Object.keys(CARD_LOOK) as (keyof CardLook)[]) {
    if (JSON.stringify(look[key]) !== JSON.stringify(CARD_LOOK[key])) lookDiff[key] = look[key]
  }
  const preset = holoPreset(card.tier, card.reverse)
  const finishDiff: Record<string, number> = {}
  for (const [k, v] of Object.entries(finish) as [keyof BenchFinish, number][]) {
    if (v !== preset[k]) finishDiff[k] = v
  }
  const out: Record<string, unknown> = { look: lookDiff }
  if (Object.keys(finishDiff).length > 0) {
    out.finish = { tier: card.tier, reverse: card.reverse, ...finishDiff }
  }
  return JSON.stringify(out, null, 2)
}
