import { useEffect, useMemo, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../../shared/lib/motion'
import { readThemeColors } from '../../../shared/lib/theme'
import { TIER_LABEL } from '../../catalog/model'
import { CardViewer } from '../engine/CardViewer'
import type { FinishPatch } from '../engine/Card'
import { holoPreset } from '../engine/holo.glsl'
import { CARD_LOOK, type CardLook } from '../engine/look'
import { useTilt } from '../hooks/useTilt'
import {
  BENCH_CARDS,
  BENCH_SLIDERS,
  benchExport,
  benchValue,
  withBenchValue,
  type BenchSlider,
} from '../lab'
import s from './opening.module.css'

/**
 * Bancada de material (fase 1 do plano): uma carta no visualizador do álbum, controles que mexem nos
 * uniforms ao vivo e "Copiar valores" com o que mudou em relação ao código.
 */
export default function LabBench() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<CardViewer | null>(null)
  const colors = useMemo(readThemeColors, [])
  const [index, setIndex] = useState(BENCH_CARDS.length - 1)
  const [look, setLook] = useState<CardLook>(CARD_LOOK)
  const [finish, setFinish] = useState<FinishPatch>({})
  const [spin, setSpin] = useState(false)
  const [dark, setDark] = useState(true)
  const [copied, setCopied] = useState(false)
  const card = BENCH_CARDS[index]!
  const preset = { ...holoPreset(card.tier, card.reverse), ...finish }

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
  useEffect(() => viewerRef.current?.setLook(look), [look])
  useEffect(() => viewerRef.current?.setFinish(finish), [finish])
  useEffect(() => viewerRef.current?.setSpin(spin), [spin])
  useTilt(viewerRef, containerRef)

  const change = (slider: BenchSlider, value: number) => {
    if (slider.group === 'finish') setFinish((f) => ({ ...f, [slider.key]: value }))
    else setLook((l) => withBenchValue(l, slider.key, value))
  }
  const copy = () => {
    const text = benchExport(look, card, finish)
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className={s.bench}>
      <div
        ref={containerRef}
        className={s.benchView}
        data-dark={dark || undefined}
        role="img"
        aria-label={card.name}
      />
      <form className={s.benchPanel} onSubmit={(e) => e.preventDefault()}>
        <label className={s.benchRow}>
          <span>Carta</span>
          <select
            value={index}
            onChange={(e) => {
              setIndex(Number(e.target.value))
              setFinish({})
            }}
          >
            {BENCH_CARDS.map((c, i) => (
              <option key={`${c.n}-${c.reverse}`} value={i}>
                {c.name} · {c.reverse ? 'Reverse' : TIER_LABEL[c.tier]}
              </option>
            ))}
          </select>
        </label>
        <div className={s.benchChecks}>
          <label>
            <input type="checkbox" checked={spin} onChange={(e) => setSpin(e.target.checked)} />
            Girar sozinha
          </label>
          <label>
            <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
            Fundo da abertura
          </label>
        </div>
        {(['look', 'finish'] as const).map((group) => (
          <fieldset key={group} className={s.benchGroup}>
            <legend>
              {group === 'look' ? 'Corpo e luz (todas as cartas)' : 'Acabamento deste tier'}
            </legend>
            {BENCH_SLIDERS.filter((sl) => sl.group === group).map((sl) => {
              const value = benchValue(look, preset, sl.key)
              return (
                <label key={sl.key} className={s.benchRow}>
                  <span>{sl.label}</span>
                  <input
                    type="range"
                    min={sl.min}
                    max={sl.max}
                    step={sl.step}
                    value={value}
                    onChange={(e) => change(sl, Number(e.target.value))}
                  />
                  <output>{Number(value.toFixed(3))}</output>
                </label>
              )
            })}
          </fieldset>
        ))}
        <div className={s.benchActions}>
          <button type="button" className={s.link} onClick={copy}>
            {copied ? 'Copiado' : 'Copiar valores'}
          </button>
          <button
            type="button"
            className={s.link}
            onClick={() => {
              setLook(CARD_LOOK)
              setFinish({})
            }}
          >
            Restaurar
          </button>
        </div>
      </form>
    </div>
  )
}
