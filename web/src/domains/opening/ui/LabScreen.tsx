import { useCallback, useState } from 'react'
import { TIER_LABEL } from '../../catalog/model'
import type { PackCard } from '../../packs/model'
import { LAB_ART, LAB_TIERS, labBenchFromUrl, labPack, labTierFromUrl, type LabTier } from '../lab'
import LabBench from './LabBench'
import s from './opening.module.css'
import { OpeningStage } from './OpeningStage'
import { Summary } from './Summary'

/**
 * Protótipo da etapa 5: dados falsos, imagens reais, medidor de fps. `/lab?tier=hyper_rare` escolhe a
 * última carta; `/lab?bancada` abre a bancada de material.
 */
export default function LabScreen() {
  const [bench, setBench] = useState(() => labBenchFromUrl(window.location.search))
  const toggle = () => {
    const next = !bench
    window.history.replaceState(null, '', next ? '/lab?bancada' : '/lab')
    setBench(next)
  }
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
        <b>{bench ? 'Bancada' : '151'}</b>
        {!bench && <span>Pacote {packNo}</span>}
        <button type="button" className={s.link} onClick={toggle}>
          {bench ? 'Abrir pacote' : 'Bancada'}
        </button>
      </header>
      {bench ? (
        <LabBench />
      ) : (
        <LabOpening
          packNo={packNo}
          pack={pack}
          finished={finished}
          onFinished={onFinished}
          again={again}
          tier={tier}
          setTier={setTier}
        />
      )}
    </div>
  )
}

function LabOpening({
  packNo,
  pack,
  finished,
  onFinished,
  again,
  tier,
  setTier,
}: {
  packNo: number
  pack: PackCard[]
  finished: boolean
  onFinished: () => void
  again: () => void
  tier: LabTier
  setTier: (t: LabTier) => void
}) {
  return (
    <>
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
    </>
  )
}
