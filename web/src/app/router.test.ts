import { expect, it } from 'vitest'
import { matchRoute } from './router'

it('resolve as rotas do app', () => {
  expect(matchRoute('/')).toEqual({ name: 'home' })
  expect(matchRoute('/abrir')).toEqual({ name: 'open' })
  expect(matchRoute('/album/')).toEqual({ name: 'album' })
  expect(matchRoute('/historico')).toEqual({ name: 'history' })
  expect(matchRoute('/historico/01J-abc')).toEqual({ name: 'pack', id: '01J-abc' })
  expect(matchRoute('/historico/a%2Fb')).toEqual({ name: 'pack', id: 'a/b' })
  expect(matchRoute('/lab')).toEqual({ name: 'lab' })
  expect(matchRoute('/nada')).toEqual({ name: 'missing' })
  expect(matchRoute('/historico/%E0%A4%A')).toEqual({ name: 'missing' })
})
