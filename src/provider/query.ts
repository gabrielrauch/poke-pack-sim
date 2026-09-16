export const TCGDEX_GRAPHQL = 'https://api.tcgdex.net/v2/graphql'

/**
 * `@locale` precisa ser a primeira diretiva do campo raiz (o resolver lê directives[0]).
 * `set.cards` são resumos sem raridade, por isso a lista completa vem de `cards` filtrada por id (substring).
 */
export const CATALOG_QUERY = `
query Catalog($prefix: ID, $id: ID, $lang: String!) {
  set(id: $id) @locale(lang: $lang) {
    id
    name
    logo
    symbol
    cardCount {
      official
      total
    }
  }
  cards(filters: { id: $prefix }, pagination: { page: 1, itemsPerPage: 500 }) @locale(lang: $lang) {
    id
    localId
    name
    rarity
    category
    image
    variants {
      normal
      reverse
      holo
    }
  }
}
`.trim()

export function catalogVariables(setId: string, lang: string) {
  return { id: setId, prefix: `${setId}-`, lang }
}
