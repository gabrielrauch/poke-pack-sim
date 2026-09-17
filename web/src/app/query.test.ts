import { expect, it } from 'vitest'
import { ApiError } from '../shared/lib/http'
import { shouldRetry } from './query'

it('rede caída e 503 tentam de novo até 2 vezes', () => {
  expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true)
  expect(shouldRetry(1, new TypeError('Failed to fetch'))).toBe(true)
  expect(shouldRetry(2, new TypeError('Failed to fetch'))).toBe(false)
  expect(shouldRetry(0, new ApiError(503, 'PROVIDER_UNAVAILABLE', null))).toBe(true)
})

it('outros erros da API são definitivos', () => {
  expect(shouldRetry(0, new ApiError(401, 'UNAUTHORIZED', null))).toBe(false)
  expect(shouldRetry(0, new ApiError(409, 'NO_PACKS', null))).toBe(false)
  expect(shouldRetry(0, new ApiError(500, 'INTERNAL', null))).toBe(false)
})
