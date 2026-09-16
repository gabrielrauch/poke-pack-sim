import { expect, it } from 'vitest'
import { ApiError } from '../../shared/lib/http'
import { againLabel, classifyOpenError, newPackId, openFailureText, packsLeftText } from './model'

it('pack_id aceito pela API (8–64 chars de [A-Za-z0-9_-]) e único', () => {
  const a = newPackId()
  expect(a).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
  expect(newPackId()).not.toBe(a)
})

it('classifica o erro da abertura', () => {
  expect(classifyOpenError(new TypeError('Failed to fetch'))).toEqual({ kind: 'offline' })
  expect(classifyOpenError(new ApiError(401, 'UNAUTHORIZED', null))).toEqual({
    kind: 'unauthorized',
  })
  expect(
    classifyOpenError(
      new ApiError(409, 'NO_PACKS', { next_refill_at: '2026-09-17T03:00:00.000Z' }),
    ),
  ).toEqual({ kind: 'no_packs', nextRefillAt: '2026-09-17T03:00:00.000Z' })
  expect(classifyOpenError(new ApiError(409, 'NO_PACKS', null))).toEqual({
    kind: 'no_packs',
    nextRefillAt: null,
  })
  expect(classifyOpenError(new ApiError(503, 'PROVIDER_UNAVAILABLE', null))).toEqual({
    kind: 'unavailable',
  })
  expect(classifyOpenError(new ApiError(409, 'PACK_MISMATCH', null))).toEqual({
    kind: 'unknown',
    code: 'PACK_MISMATCH',
  })
})

it('texto por tipo de falha (hora da recarga no fuso pedido)', () => {
  expect(openFailureText({ kind: 'offline' })).toEqual({
    title: 'Sem conexão',
    detail: 'Abrir pacote precisa de internet. Tenta de novo.',
    retry: true,
  })
  expect(openFailureText({ kind: 'unauthorized' }).retry).toBe(false)
  expect(
    openFailureText(
      { kind: 'no_packs', nextRefillAt: '2026-09-17T03:00:00.000Z' },
      'America/Sao_Paulo',
    ),
  ).toEqual({
    title: 'Sem pacotes por hoje',
    detail: 'O próximo chega às 00:00.',
    retry: false,
  })
  expect(openFailureText({ kind: 'no_packs', nextRefillAt: null }).detail).toBe('Volta amanhã.')
  expect(openFailureText({ kind: 'unavailable' }).retry).toBe(true)
  expect(openFailureText({ kind: 'unknown', code: 'INTERNAL' }).detail).toBe(
    'Erro INTERNAL. Tenta de novo.',
  )
})

it('botão do resumo e chip do cabeçalho', () => {
  expect(againLabel(2)).toBe('Abrir outro pacote')
  expect(againLabel(0)).toBe('Volta amanhã')
  expect(packsLeftText(2)).toBe('2 pacotes restantes')
  expect(packsLeftText(1)).toBe('1 pacote restante')
  expect(packsLeftText(0)).toBe('Último de hoje')
})
