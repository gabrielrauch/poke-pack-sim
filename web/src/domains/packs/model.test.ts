import { describe, expect, it } from 'vitest'
import { ApiError } from '../../shared/lib/http'
import {
  againLabel,
  classifyOpenError,
  newPackId,
  openedCountText,
  openFailureText,
  packsLeftText,
  quotaText,
  refillText,
} from './model'

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
    title: 'Sem pacotes agora',
    detail: 'O próximo chega às 00:00.',
    retry: false,
  })
  expect(openFailureText({ kind: 'no_packs', nextRefillAt: null }).detail).toBe(
    'Volta na próxima recarga.',
  )
  expect(openFailureText({ kind: 'unavailable' }).retry).toBe(true)
  expect(openFailureText({ kind: 'unknown', code: 'INTERNAL' }).detail).toBe(
    'Erro INTERNAL. Tenta de novo.',
  )
})

it('botão do resumo e chip do cabeçalho', () => {
  expect(againLabel(2)).toBe('Abrir outro pacote')
  expect(againLabel(0)).toBe('Volta mais tarde')
  expect(packsLeftText(2)).toBe('2 pacotes restantes')
  expect(packsLeftText(1)).toBe('1 pacote restante')
  expect(packsLeftText(0)).toBe('Último por agora')
})

describe('Início (§7.1)', () => {
  it('contador de pacotes', () => {
    expect(quotaText(0)).toBe('Sem pacotes agora')
    expect(quotaText(1)).toBe('1 pacote para abrir')
    expect(quotaText(7)).toBe('7 pacotes para abrir')
  })

  it('hora da próxima recarga, quanto entra, ou cota cheia', () => {
    const at = '2026-09-17T21:00:00Z'
    expect(refillText(at, 0, 'America/Sao_Paulo')).toBe('Volta às 18:00')
    expect(refillText(at, 3, 'America/Sao_Paulo')).toBe('Mais 22 às 18:00')
    expect(refillText(at, 25, 'America/Sao_Paulo')).toBe('Cota cheia')
  })

  it('total aberto', () => {
    expect(openedCountText(0)).toBe('Nenhum pacote aberto')
    expect(openedCountText(1)).toBe('1 pacote aberto')
    expect(openedCountText(12)).toBe('12 pacotes abertos')
  })
})
