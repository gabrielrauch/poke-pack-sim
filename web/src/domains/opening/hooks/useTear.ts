import { useEffect, type RefObject } from 'react'
import type { OpeningScene } from '../engine/OpeningScene'
import { inTearZone, onPack, type Rect } from '../engine/tear'

const TAP_MAX = 12
const TAP_MS = 400
/** Dedo parado por mais que isto antes de soltar: velocidade zero (a carta volta se não passou do limite). */
const STILL_MS = 100
const KEYS = new Set([' ', 'Enter', 'ArrowUp', 'ArrowRight', 'ArrowLeft'])

/**
 * §8.4 sobre o retângulo projetado do pacote (corte pela tira) e, depois, a pilha estilo TCG Pocket:
 * a carta do topo segue o dedo e sai pelo lado; toque joga para a direita; setas/espaço no desktop.
 */
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
    /** `v` é a velocidade em x (px/ms) suavizada; `px`/`pt` a última amostra. */
    let gesture: { x: number; y: number; t: number; v: number; px: number; pt: number } | null =
      null

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
      } else if (scene.state === 'card' && scene.dragStart()) {
        const t = performance.now()
        gesture = { x: e.clientX, y: e.clientY, t, v: 0, px: e.clientX, pt: t }
        el.setPointerCapture(e.pointerId)
      }
    }
    const onMove = (e: PointerEvent) => {
      if (gesture) {
        const t = performance.now()
        if (t > gesture.pt) {
          const v = (e.clientX - gesture.px) / (t - gesture.pt)
          gesture.v = gesture.v * 0.3 + v * 0.7
        }
        gesture.px = e.clientX
        gesture.pt = t
        sceneRef.current?.dragMove(e.clientX - gesture.x, e.clientY - gesture.y)
        e.preventDefault()
        return
      }
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
      if (gesture) {
        const now = performance.now()
        const dx = e.clientX - gesture.x
        const dy = e.clientY - gesture.y
        if (Math.abs(dx) < TAP_MAX && Math.abs(dy) < TAP_MAX && now - gesture.t < TAP_MS) {
          scene.dragEnd(0, 0)
          scene.next(1)
        } else {
          scene.dragEnd(dx, now - gesture.pt > STILL_MS ? 0 : gesture.v)
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
      if (gesture) scene?.dragEnd(0, 0)
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
        scene.next(e.key === 'ArrowLeft' ? -1 : 1)
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
