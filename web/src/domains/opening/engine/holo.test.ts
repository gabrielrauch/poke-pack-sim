import { expect, it } from 'vitest'
import { holoPreset } from './holo.glsl'

it('reverse de qualquer tier usa a moldura com buraco na arte', () => {
  expect(holoPreset('common', true)).toMatchObject({ mask: 1, foil: 0.6, sparkle: 0 })
  expect(holoPreset('rare', true).mask).toBe(1)
})

it('tabela do §8.9', () => {
  expect(holoPreset('common', false)).toMatchObject({ mask: 0, foil: 0, sparkle: 0 })
  expect(holoPreset('uncommon', false).mask).toBe(0)
  expect(holoPreset('rare', false)).toMatchObject({ mask: 2, foil: 0.45 })
  expect(holoPreset('holo', false).mask).toBe(2)
  expect(holoPreset('double_rare', false)).toMatchObject({ mask: 2, edgeStrength: 0.55 })
  expect(holoPreset('illustration_rare', false)).toMatchObject({
    mask: 3,
    foil: 0.5,
    sparkle: 1,
    gold: 0,
  })
  expect(holoPreset('ultra_rare', false).mask).toBe(3)
  expect(holoPreset('special_illustration_rare', false).sparkle).toBe(1)
  expect(holoPreset('hyper_rare', false)).toMatchObject({
    mask: 3,
    foil: 0.62,
    gold: 1,
    sparkle: 1,
  })
  expect(holoPreset('ace_spec', false).mask).toBe(3)
})
