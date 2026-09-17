import { ApiError } from '../../shared/lib/http'

export const TOKEN_KEY = 'pack-sim:token'
/** Espelha `TOKEN` de `src/api/auth.ts`. */
export const TOKEN = /^[A-Za-z0-9_-]{16,128}$/

/** `#t=<token>` (link enviado, §5) ou `?t=<token>` (`start_url` do manifest no iOS). O fragmento vence. */
export function tokenFromLocation(hash: string, search: string): string | null {
  const fromHash = new URLSearchParams(hash.replace(/^#/, '')).get('t')
  const fromSearch = new URLSearchParams(search).get('t')
  const t = fromHash ?? fromSearch
  return t !== null && TOKEN.test(t) ? t : null
}

/** Mesma URL sem `t` (para `history.replaceState`); o fragmento some junto. */
export function urlWithoutToken(pathname: string, search: string): string {
  const params = new URLSearchParams(search)
  params.delete('t')
  const rest = params.toString()
  return rest ? `${pathname}?${rest}` : pathname
}

/** Manifest com `start_url` carregando o token: o app instalado no iOS abre sem o fragmento. */
export function manifestHref(token: string): string {
  return `/manifest.webmanifest?t=${encodeURIComponent(token)}`
}

/** Resposta de `GET /api/me` (§5). */
export type Me = {
  id: string
  name: string
  packs_available: number
  next_refill_at: string
  total_packs: number
  packs_since_hit: number
  favorites: string[]
}

/** Texto colado na tela de acesso: o link inteiro (`#t=` ou `?t=`) ou só o código. */
export function tokenFromPastedLink(text: string): string | null {
  const raw = text.trim()
  if (TOKEN.test(raw)) return raw
  try {
    const url = new URL(raw)
    return tokenFromLocation(url.hash, url.search)
  } catch {
    return null
  }
}

export const isUnauthorized = (err: unknown): boolean =>
  err instanceof ApiError && err.status === 401

/** Quando consultar `/api/me` de novo: 1 s depois da recarga, entre 5 s e 30 min. */
export function refillDelay(nextRefillAt: string, now: number): number {
  const ms = Date.parse(nextRefillAt) - now + 1000
  return Math.min(30 * 60_000, Math.max(5_000, ms))
}

export const ACCESS_TEXT = {
  missing: {
    title: 'Colar link de acesso',
    detail: 'Cola aqui o link que você recebeu (ou só o código dele).',
  },
  invalid: {
    title: 'Esse link não vale mais',
    detail: 'Pede um link novo e cola ele aqui.',
  },
} as const
