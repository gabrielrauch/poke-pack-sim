import recipe from '../../../../src/pack/recipes/sv.json'
import type { Tier } from '../../../../src/provider/types'

export type { Tier }

/** Tiers que contam como "puxada grande" (§6, recipe `hit_tiers`). */
export const HIT_TIERS: ReadonlySet<string> = new Set(recipe.hit_tiers)
/** Burst dourado (§8.8); os outros hits são rosa. */
export const GOLD_TIERS: ReadonlySet<string> = new Set([
  'ultra_rare',
  'special_illustration_rare',
  'hyper_rare',
])
export const isHit = (tier: string): boolean => HIT_TIERS.has(tier)

export const TIER_LABEL: Record<Tier, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Rara',
  holo: 'Rara Holo',
  double_rare: 'Rara Dupla',
  illustration_rare: 'Rara Ilustração',
  ultra_rare: 'Ultra Rara',
  special_illustration_rare: 'Rara Ilustração Especial',
  hyper_rare: 'Hiper Rara',
  ace_spec: 'ACE SPEC',
  shiny_rare: 'Rara Brilhante',
  shiny_ultra_rare: 'Ultra Rara Brilhante',
  black_white_rare: 'Rara Preto e Branco',
  mega_hyper_rare: 'Mega Hiper Rara',
}

export type ImageSize = 'low' | 'high'

const IMAGE_ORIGIN = 'https://assets.tcgdex.net'

/** URL do CDN do TCGdex → passthrough do Worker (`GET /api/img/*`), mesma origem: o CDN manda CORS duplicado. */
export function proxiedImage(url: string): string {
  return url.startsWith(IMAGE_ORIGIN) ? `/api/img${url.slice(IMAGE_ORIGIN.length)}` : url
}

/** `img` é a URL base do TCGdex sem extensão (§7.2: `low.webp` em grades, `high.webp` nas texturas). */
export function cardImage(img: string | null, size: ImageSize): string | null {
  return img ? proxiedImage(`${img}/${size}.webp`) : null
}
