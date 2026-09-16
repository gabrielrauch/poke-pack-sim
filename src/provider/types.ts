export type Tier =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'holo'
  | 'double_rare'
  | 'illustration_rare'
  | 'ultra_rare'
  | 'special_illustration_rare'
  | 'hyper_rare'
  | 'ace_spec'
  | 'shiny_rare'
  | 'shiny_ultra_rare'
  | 'black_white_rare'
  | 'mega_hyper_rare'

/** `n` é o localId do TCGdex, string opaca com zero à esquerda ("001"). `img` é a URL base sem extensão. */
export type Card = { n: string; name: string; tier: Tier; reverse: boolean; img: string | null }

export type SetCatalog = {
  id: string
  name: string
  lang: string
  total: number
  logo: string | null
  symbol: string | null
  cards: Card[]
}

export interface CardProvider {
  /** `null` quando o set não existe no TCGdex. Lança `ProviderError` em qualquer outra falha. */
  getSet(setId: string, lang: string): Promise<SetCatalog | null>
}
