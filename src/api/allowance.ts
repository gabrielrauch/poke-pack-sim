import { parseRecipe } from '../pack'
import sv from '../pack/recipes/sv.json'

/** Cota diária é global (uma usuária, uma era); vem da recipe sv. */
export const ALLOWANCE = parseRecipe(sv).allowance
