import { PATHS } from '../shared/lib/router'

export type Route =
  | { name: 'home' }
  | { name: 'open' }
  | { name: 'album' }
  | { name: 'history' }
  | { name: 'pack'; id: string }
  | { name: 'lab' }
  | { name: 'missing' }

/** Tabela de rotas do app; barra final é ignorada. */
export function matchRoute(pathname: string): Route {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (path === PATHS.home) return { name: 'home' }
  if (path === PATHS.open) return { name: 'open' }
  if (path === PATHS.album) return { name: 'album' }
  if (path === PATHS.history) return { name: 'history' }
  if (path === PATHS.lab) return { name: 'lab' }
  const pack = /^\/historico\/([^/]+)$/.exec(path)
  if (pack) {
    try {
      return { name: 'pack', id: decodeURIComponent(pack[1]!) }
    } catch {
      return { name: 'missing' }
    }
  }
  return { name: 'missing' }
}
