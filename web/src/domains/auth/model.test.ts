import { expect, it } from 'vitest'
import { ApiError } from '../../shared/lib/http'
import {
  isUnauthorized,
  manifestHref,
  refillDelay,
  tokenFromLocation,
  tokenFromPastedLink,
  urlWithoutToken,
} from './model'

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

const T = 'abcdefghijklmnopqrstuvwxyz0123456789_-ABC'

it('aceita o link inteiro, o link com ?t= ou só o código', () => {
  expect(tokenFromPastedLink(`https://x.workers.dev/#t=${T}`)).toBe(T)
  expect(tokenFromPastedLink(`  https://x.workers.dev/?t=${T}\n`)).toBe(T)
  expect(tokenFromPastedLink(T)).toBe(T)
  expect(tokenFromPastedLink('https://x.workers.dev/')).toBeNull()
  expect(tokenFromPastedLink('oi')).toBeNull()
  expect(tokenFromPastedLink('')).toBeNull()
})

it('401 é link inválido; o resto não', () => {
  expect(isUnauthorized(new ApiError(401, 'UNAUTHORIZED', null))).toBe(true)
  expect(isUnauthorized(new ApiError(503, 'X', null))).toBe(false)
  expect(isUnauthorized(new TypeError('x'))).toBe(false)
})

it('próxima consulta do /me: logo depois da recarga, entre 5 s e 30 min', () => {
  const now = Date.parse('2026-09-17T20:00:00Z')
  expect(refillDelay('2026-09-17T21:00:00Z', now)).toBe(30 * 60_000)
  expect(refillDelay('2026-09-17T20:00:10Z', now)).toBe(11_000)
  expect(refillDelay('2026-09-17T19:00:00Z', now)).toBe(5_000)
})
