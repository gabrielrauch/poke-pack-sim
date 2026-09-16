import { useEffect, type RefObject } from 'react'
import type { OpeningScene } from '../engine/OpeningScene'
import { inTearZone, onPack, type Rect } from '../engine/tear'

const SWIPE_UP = -45
const TAP_MAX = 12
const TAP_MS = 400
const KEYS = new Set([' ', 'Enter', 'ArrowUp'])

/** §8.4 e §8.6 sobre o retângulo projetado do pacote: corte pela tira, toque/deslize para virar, teclado no desktop. */
export function useTear(
  sceneRef: RefObject<OpeningScene | null>,
  containerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let rect: Rect | null = null
    let x0 = 0
    let tearing = false
    let gesture: { x: number; y: number; t: number } | null = null

    const packRect = (): Rect | null => {
      const r = sceneRef.current?.packRect()
      if (!r) return null
      const c = el.getBoundingClientRect()
      return { left: c.left + r.left, top: c.top + r.top, width: r.width, height: r.height }
    }
    const xFrac = (clientX: number) =>
      rect ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0

    const onDown = (e: PointerEvent) => {
      const scene = sceneRef.current
      if (!scene) return
      if (scene.state === 'pack') {
        const r = packRect()
        if (!r) return
        if (inTearZone(r, e.clientX, e.clientY)) {
          rect = r
          x0 = e.clientX
          tearing = true
          scene.tearStart(xFrac(e.clientX))
          el.setPointerCapture(e.pointerId)
        } else {
          if (onPack(r, e.clientX, e.clientY)) scene.setHeld(true)
          scene.nudge()
        }
      } else if (scene.state === 'card') {
        gesture = { x: e.clientX, y: e.clientY, t: performance.now() }
      }
    }
    const onMove = (e: PointerEvent) => {
      if (!tearing || !rect) return
      sceneRef.current?.tearMove(xFrac(e.clientX), e.clientX - x0, rect.width)
      e.preventDefault()
    }
    const onUp = (e: PointerEvent) => {
      const scene = sceneRef.current
      if (!scene) return
      scene.setHeld(false)
      if (tearing) {
        tearing = false
        scene.tearEnd()
        return
      }
      if (gesture && scene.state === 'card') {
        const dx = e.clientX - gesture.x
        const dy = e.clientY - gesture.y
        const dt = performance.now() - gesture.t
        if (dy < SWIPE_UP || (Math.abs(dx) < TAP_MAX && Math.abs(dy) < TAP_MAX && dt < TAP_MS)) {
          scene.next()
        }
      }
      gesture = null
    }
    const onCancel = () => {
      const scene = sceneRef.current
      scene?.setHeld(false)
      if (tearing) {
        tearing = false
        scene?.tearCancel()
      }
      gesture = null
    }
    const onKey = (e: KeyboardEvent) => {
      const scene = sceneRef.current
      if (!scene || !KEYS.has(e.key)) return
      if (scene.state === 'pack') {
        e.preventDefault()
        scene.completeTear()
      } else if (scene.state === 'card') {
        e.preventDefault()
        scene.next()
      }
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    document.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      document.removeEventListener('keydown', onKey)
    }
  }, [sceneRef, containerRef])
}
