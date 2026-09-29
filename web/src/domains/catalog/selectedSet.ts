import { useSyncExternalStore } from 'react'
import { DEFAULT_SET, resolveSet, SET_KEY } from './model'

let current: string | null = null
const listeners = new Set<() => void>()

/** Set escolhido no seletor; vale para Início, abertura e álbum. Lido do localStorage uma vez. */
export function getSelectedSet(): string {
  if (current === null) current = resolveSet(read())
  return current
}

export function selectSet(id: string): void {
  const next = resolveSet(id)
  if (next === getSelectedSet()) return
  current = next
  try {
    localStorage.setItem(SET_KEY, next)
  } catch {
    // modo privado sem storage: a escolha vive só nesta aba
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useSelectedSet(): string {
  return useSyncExternalStore(subscribe, getSelectedSet, () => DEFAULT_SET)
}

function read(): string | null {
  try {
    return localStorage.getItem(SET_KEY)
  } catch {
    return null
  }
}
