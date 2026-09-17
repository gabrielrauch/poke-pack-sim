import { useCallback } from 'react'
import { drawPackFront, PACK_ASPECT } from '../../../shared/lib/packArt'
import type { PackArt } from '../../catalog/model'
import s from './packs.module.css'

const W = 512

/** Booster chapado em canvas 2D (mesma arte da cena, sem Three). Repinta quando arte ou logo mudam. */
export function PackPreview({
  art,
  logo,
  dimmed,
}: {
  art: PackArt | null
  logo: HTMLImageElement | null
  dimmed: boolean
}) {
  const paint = useCallback(
    (el: HTMLCanvasElement | null) => {
      const ctx = el?.getContext('2d')
      if (!el || !ctx || !art) return
      drawPackFront(ctx, el.width, el.height, { name: art.name, subtitle: art.subtitle, logo })
    },
    [art, logo],
  )
  return (
    <canvas
      ref={paint}
      width={W}
      height={Math.round(W * PACK_ASPECT)}
      className={`${s.pack} ${dimmed ? s.dimmed : ''}`}
      aria-hidden="true"
    />
  )
}
