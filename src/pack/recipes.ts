import { parseRecipe, type Recipe } from './recipe'
import sv from './recipes/sv.json'

const BY_SERIES: Record<string, unknown> = { sv }

/** Série pelo prefixo alfabético do id do set: `sv03.5` → `sv`. Sem recipe para a série, `null`. */
export function recipeForSet(setId: string): Recipe | null {
  const series = setId.replace(/[0-9].*$/, '')
  const raw = BY_SERIES[series]
  return raw === undefined ? null : parseRecipe(raw)
}
