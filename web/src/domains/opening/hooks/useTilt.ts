import { useEffect, type RefObject } from 'react'
import type { OpeningScene } from '../engine/OpeningScene'
import { tiltFromOrientation, tiltFromPointer } from '../engine/tilt'

type OrientationCtor = { requestPermission?: () => Promise<string> }

/** §8.2: `deviceorientation` (permissão pedida no primeiro pointerup, iOS e Chrome) ou mouse relativo ao centro. */
export function useTilt(
  sceneRef: RefObject<OpeningScene | null>,
  containerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let orient = false
    let asked = false
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      orient = true
      const [px, py] = tiltFromOrientation(e.gamma, e.beta)
      sceneRef.current?.setTiltTarget(px, py)
    }
    const onMove = (e: PointerEvent) => {
      if (orient) return
      const [px, py] = tiltFromPointer(e.clientX, e.clientY, el.getBoundingClientRect())
      sceneRef.current?.setTiltTarget(px, py)
    }
    const onLeave = () => {
      if (!orient) sceneRef.current?.setTiltTarget(0, 0)
    }
    const askPermission = () => {
      if (asked) return
      asked = true
      const ctor = (globalThis as unknown as { DeviceOrientationEvent?: OrientationCtor })
        .DeviceOrientationEvent
      ctor?.requestPermission?.().catch(() => undefined)
    }
    window.addEventListener('deviceorientation', onOrientation)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    window.addEventListener('pointerup', askPermission)
    return () => {
      window.removeEventListener('deviceorientation', onOrientation)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('pointerup', askPermission)
    }
  }, [sceneRef, containerRef])
}
