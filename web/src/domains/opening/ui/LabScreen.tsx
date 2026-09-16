import { useCallback, useState } from 'react'
import { TIER_LABEL } from '../../catalog/model'
import type { PackCard } from '../../packs/model'
import { LAB_ART, LAB_TIERS, labPack, labTierFromUrl, type LabTier } from '../lab'
import s from './opening.module.css'
import { OpeningStage } from './OpeningStage'
import { Summary } from './Summary'

/** Protótipo da etapa 5: dados falsos, imagens reais, medidor de fps. `/lab?tier=hyper_rare` escolhe a última carta. */
export default function LabScreen() {
  const initialTier = labTierFromUrl(window.location.search)
  const [tier, setTier] = useState<LabTier>(initialTier)
  const [pack, setPack] = useState<PackCard[]>(() => labPack(initialTier))
  const [packNo, setPackNo] = useState(1)
  const [finished, setFinished] = useState(false)
  const onFinished = useCallback(() => setFinished(true), [])
  const again = useCallback(() => {
    setPack(labPack(tier))
    setFinished(false)
    setPackNo((n) => n + 1)
  }, [tier])

  return (
    <div className={s.stage}>
      <header className={s.top}>
        <b>151</b>
        <span>Pacote {packNo}</span>
      </header>
      <OpeningStage session={packNo} pack={pack} art={LAB_ART} onFinished={onFinished} stats />
      {finished && (
        <Summary cards={pack} onAgain={again}>
          <label className={s.opt}>
            Última carta
            <select value={tier} onChange={(e) => setTier(e.target.value as LabTier)}>
              {LAB_TIERS.map((t) => (
                <option key={t} value={t}>
                  {TIER_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        </Summary>
      )}
    </div>
  )
}
