import { expect, it } from 'vitest'
import { ApiError, request } from './http'

type Call = { url: string; init: RequestInit | undefined }

/** `fetch` falso que grava a chamada e responde `body` com `status`. */
function stub(status: number, body: unknown, calls: Call[] = []): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    const text = body === null ? '' : JSON.stringify(body)
    return new Response(text, { status, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
}

it('GET devolve o JSON e manda o bearer', async () => {
  const calls: Call[] = []
  const out = await request<{ ok: boolean }>(
    '/api/me',
    { token: 'tok_123456789012' },
    stub(200, { ok: true }, calls),
  )
  expect(out).toEqual({ ok: true })
  expect(calls[0]!.url).toBe('/api/me')
  expect(calls[0]!.init?.method).toBe('GET')
  expect((calls[0]!.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok_123456789012',
  )
  expect(calls[0]!.init?.body).toBeUndefined()
})

it('POST serializa o corpo e marca content-type', async () => {
  const calls: Call[] = []
  await request(
    '/api/packs',
    { method: 'POST', body: { set_id: 'sv03.5', pack_id: 'abcdefgh' } },
    stub(200, {}, calls),
  )
  expect(calls[0]!.init?.body).toBe('{"set_id":"sv03.5","pack_id":"abcdefgh"}')
  expect((calls[0]!.init?.headers as Record<string, string>)['Content-Type']).toBe(
    'application/json',
  )
  expect((calls[0]!.init?.headers as Record<string, string>).Authorization).toBeUndefined()
})

it('fora de 2xx lança ApiError com o code do corpo', async () => {
  const err = await request(
    '/api/packs',
    {},
    stub(409, { error: 'NO_PACKS', next_refill_at: 'x' }),
  ).catch((e: unknown) => e)
  expect(err).toBeInstanceOf(ApiError)
  const api = err as ApiError
  expect(api.status).toBe(409)
  expect(api.code).toBe('NO_PACKS')
  expect(api.body).toEqual({ error: 'NO_PACKS', next_refill_at: 'x' })
})

it('sem corpo JSON o code é HTTP_<status>', async () => {
  const err = (await request('/x', {}, stub(502, null)).catch((e: unknown) => e)) as ApiError
  expect(err.code).toBe('HTTP_502')
  expect(err.body).toBeNull()
})
