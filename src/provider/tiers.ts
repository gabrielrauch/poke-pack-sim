import type { Tier } from './types'

/** Ordem crescente. O pack builder usa para cair um tier abaixo quando um tier não existe no set. */
export const TIER_ORDER = [
  'common',
  'uncommon',
  'rare',
  'holo',
  'double_rare',
  'illustration_rare',
  'ultra_rare',
  'special_illustration_rare',
  'hyper_rare',
  'ace_spec',
  'shiny_rare',
  'shiny_ultra_rare',
  'black_white_rare',
  'mega_hyper_rare',
] as const satisfies readonly Tier[]

/** Chaves em minúsculas: a comparação ignora caixa. Raridade fora daqui (Promo, None...) é erro no catálogo. */
const RARITY_TO_TIER: Record<string, Tier> = {
  common: 'common',
  uncommon: 'uncommon',
  rare: 'rare',
  'rare holo': 'holo',
  'holo rare': 'holo',
  'double rare': 'double_rare',
  'illustration rare': 'illustration_rare',
  'ultra rare': 'ultra_rare',
  'special illustration rare': 'special_illustration_rare',
  'hyper rare': 'hyper_rare',
  'ace spec rare': 'ace_spec',
  'shiny rare': 'shiny_rare',
  'shiny ultra rare': 'shiny_ultra_rare',
  'black white rare': 'black_white_rare',
  'mega hyper rare': 'mega_hyper_rare',
}

export function tierOf(rarity: string | null | undefined): Tier | null {
  if (rarity == null) return null
  return RARITY_TO_TIER[rarity.trim().toLowerCase()] ?? null
}
