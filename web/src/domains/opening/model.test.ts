import { expect, it } from 'vitest'
import type { PackCard } from '../packs/model'
import { fallbackHint, fanTransform, hintFor, summarySubtitle, summaryTitle } from './model'

const card = (tier: PackCard['tier'], isNew = false): PackCard => ({
  n: '1',
  name: 'x',
  tier,
  reverse: false,
  img: null,
  new: isNew,
})

it('hint por estado', () => {
  expect(hintFor('pack', 0, 5)).toBe('Arraste pelo topo para rasgar')
  expect(hintFor('tearing', 0, 5)).toBe('Arraste pelo topo para rasgar')
  expect(hintFor('card', 1, 5)).toBe('Deslize para cima para a próxima')
  expect(hintFor('card', 5, 5)).toBe('Deslize para cima para terminar')
  expect(hintFor('anim', 1, 5)).toBe('')
  expect(hintFor('summary', 5, 5)).toBe('')
})

it('leque do §8.10', () => {
  expect(fanTransform(2)).toBe('translate(0px, 0px) rotate(0deg)')
  expect(fanTransform(0)).toBe('translate(-68px, 18px) rotate(-18deg)')
  expect(fanTransform(4)).toBe('translate(68px, 18px) rotate(18deg)')
})

it('título e subtítulo do resumo', () => {
  expect(summaryTitle([card('common'), card('ultra_rare')])).toBe('Que puxada!')
  expect(summaryTitle([card('common'), card('rare')])).toBe('Pacote aberto')
  expect(summarySubtitle([card('common', true)])).toBe('1 carta nova para o álbum')
  expect(summarySubtitle([card('common', true), card('rare', true), card('rare')])).toBe(
    '2 cartas novas para o álbum',
  )
})

it('hint do fallback sem WebGL', () => {
  expect(fallbackHint(0, 5, false)).toBe('Preparando o pacote…')
  expect(fallbackHint(0, 5, true)).toBe('Toque para abrir')
  expect(fallbackHint(2, 5, true)).toBe('Toque para a próxima')
  expect(fallbackHint(5, 5, true)).toBe('Toque para terminar')
})
