import type { Tier } from '../catalog/model'
import type { PackCard } from '../packs/model'
import type { PackArt } from './engine/OpeningScene'

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
export const LAB_ART: PackArt = { name: '151', subtitle: '5 cartas', logo: `${IMG}/logo.png` }

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

export function labTierFromUrl(search: string): LabTier {
  const t = new URLSearchParams(search).get('tier')
  return t && (LAB_TIERS as string[]).includes(t) ? (t as LabTier) : 'special_illustration_rare'
}
