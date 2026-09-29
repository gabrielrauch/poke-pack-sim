import { expect, it } from 'vitest'
import { recipeForSet } from './recipes'
import { DEFAULT_SET_ID, SETS, setInfo } from './sets'

it('151 é o padrão e todo set liberado tem recipe', () => {
  expect(DEFAULT_SET_ID).toBe('sv03.5')
  for (const set of SETS) expect(recipeForSet(set.id), set.id).not.toBeNull()
})

it('ids únicos', () => {
  expect(new Set(SETS.map((s) => s.id)).size).toBe(SETS.length)
})

it('setInfo só conhece os sets da lista', () => {
  expect(setInfo('sv02')?.name).toBe('Evoluções em Paldea')
  expect(setInfo('sv04.5')).toBeNull()
  expect(setInfo('swsh12')).toBeNull()
})
