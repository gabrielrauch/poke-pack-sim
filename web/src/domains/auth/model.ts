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
