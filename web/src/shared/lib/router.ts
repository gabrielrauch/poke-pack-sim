import { useSyncExternalStore } from 'react'

export const PATHS = {
  home: '/',
  open: '/abrir',
  album: '/album',
  history: '/historico',
  lab: '/lab',
} as const

export const packPath = (id: string): string => `${PATHS.history}/${encodeURIComponent(id)}`

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Navegação interna pela History API; quem usa `usePathname` re-renderiza. */
export function navigate(to: string, replace = false): void {
  if (replace) history.replaceState(null, '', to)
  else history.pushState(null, '', to)
  emit()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  window.addEventListener('popstate', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('popstate', cb)
  }
}

const getPath = () => window.location.pathname
const getServerPath = () => '/'

export function usePathname(): string {
  return useSyncExternalStore(subscribe, getPath, getServerPath)
}

type ClickLike = {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  defaultPrevented: boolean
}

/** Clique simples, botão esquerdo, sem modificador: o resto (nova aba etc.) fica com o navegador. */
export function isPlainClick(e: ClickLike): boolean {
  return (
    e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented
  )
}
