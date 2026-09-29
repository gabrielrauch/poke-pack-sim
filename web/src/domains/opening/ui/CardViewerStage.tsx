import { useEffect, useMemo, useRef } from 'react'
import { prefersReducedMotion } from '../../../shared/lib/motion'
import { readThemeColors } from '../../../shared/lib/theme'
import type { PackCard } from '../../packs/model'
import { CardViewer } from '../engine/CardViewer'
import { useTilt } from '../hooks/useTilt'

/** A carta em foco da abertura (holo + tilt) fora da abertura. Carregado sob demanda: traz o three. */
export default function CardViewerStage({
  card,
  className,
}: {
  card: PackCard
  className?: string | undefined
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<CardViewer | null>(null)
  const colors = useMemo(readThemeColors, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const viewer = new CardViewer(container, colors, { reducedMotion: prefersReducedMotion() })
    viewerRef.current = viewer
    return () => {
      viewer.dispose()
      viewerRef.current = null
    }
  }, [colors])

  useEffect(() => {
    void viewerRef.current?.show(card)
  }, [card])

  useTilt(viewerRef, containerRef)
  return <div ref={containerRef} className={className} role="img" aria-label={card.name} />
}
