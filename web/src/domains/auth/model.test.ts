import { expect, it } from 'vitest'
import { manifestHref, tokenFromLocation, urlWithoutToken } from './model'

const TOKEN = 'Ab3-_x9Z0123456789abcdefghijklmnopqrstuvwxy'

it('token do fragmento (link enviado) ou da query (start_url do manifest)', () => {
  expect(tokenFromLocation(`#t=${TOKEN}`, '')).toBe(TOKEN)
  expect(tokenFromLocation('', `?t=${TOKEN}`)).toBe(TOKEN)
  expect(tokenFromLocation(`#t=${TOKEN}`, '?t=outro_token_valido_1')).toBe(TOKEN)
  expect(tokenFromLocation('', '')).toBeNull()
  expect(tokenFromLocation('#t=curto', '')).toBeNull()
  expect(tokenFromLocation('#t=tem espaço e é longo o bastante', '')).toBeNull()
})

it('URL sem o token, mantendo outras queries', () => {
  expect(urlWithoutToken('/abrir', `?t=${TOKEN}`)).toBe('/abrir')
  expect(urlWithoutToken('/', `?t=${TOKEN}&tier=rare`)).toBe('/?tier=rare')
  expect(urlWithoutToken('/lab', '')).toBe('/lab')
})

it('manifest com o token na query', () => {
  expect(manifestHref(TOKEN)).toBe(`/manifest.webmanifest?t=${TOKEN}`)
})
