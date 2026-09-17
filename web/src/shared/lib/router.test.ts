import { expect, it } from 'vitest'
import { isPlainClick, packPath, PATHS } from './router'

it('monta o caminho do pacote com o id escapado', () => {
  expect(packPath('01J-abc')).toBe('/historico/01J-abc')
  expect(packPath('a/b')).toBe('/historico/a%2Fb')
  expect(PATHS.history).toBe('/historico')
})

it('só intercepta clique simples com o botão esquerdo', () => {
  const ev = {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
  }
  expect(isPlainClick(ev)).toBe(true)
  expect(isPlainClick({ ...ev, button: 1 })).toBe(false)
  expect(isPlainClick({ ...ev, metaKey: true })).toBe(false)
  expect(isPlainClick({ ...ev, defaultPrevented: true })).toBe(false)
})
