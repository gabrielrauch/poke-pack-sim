import { expect, it } from 'vitest'
import { readThemeColors, withAlpha } from './theme'

it('withAlpha converte hex curto e longo', () => {
  expect(withAlpha('#f6c744', 0.5)).toBe('rgba(246,199,68,0.5)')
  expect(withAlpha('#fff', 0)).toBe('rgba(255,255,255,0)')
  expect(withAlpha('red', 0.5)).toBe('red')
})

it('readThemeColors devolve o fallback sem DOM', () => {
  expect(readThemeColors().gold).toBe('#f6c744')
})
