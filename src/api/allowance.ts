import { parseRecipe } from '../pack'
import sv from '../pack/recipes/sv.json'

/** Cota (quantos pacotes a cada quantas horas) é global: uma usuária, uma era; vem da recipe sv. */
export const ALLOWANCE = parseRecipe(sv).allowance
