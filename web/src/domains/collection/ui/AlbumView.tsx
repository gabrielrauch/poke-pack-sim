import sh from '../../../shared/ui/shared.module.css'
import { cardImage, TIER_LABEL, type Tier } from '../../catalog/model'
import { filterByTier, progressText, type AlbumCard } from '../model'
import { CardSheet } from './CardSheet'
import s from './collection.module.css'

/** Álbum (§7.1): grade por número, faltantes em silhueta, contador, filtro por tier, carta em foco. */
export function AlbumView({
  setName,
  album,
  tier,
  tiers,
  onTier,
  selected,
  onSelect,
  offline,
}: {
  setName: string
  album: readonly AlbumCard[] | null
  tier: Tier | null
  tiers: readonly Tier[]
  onTier: (tier: Tier | null) => void
  selected: AlbumCard | null
  onSelect: (card: AlbumCard | null) => void
  offline: boolean
}) {
  return (
    <main className={sh.screen}>
      <header className={sh.header}>
        <h1>{setName || 'Álbum'}</h1>
        <b className={s.progress}>{album ? progressText(album) : ''}</b>
      </header>
      {album && (
        <label className={s.filter}>
          Raridade
          <select
            value={tier ?? ''}
            onChange={(e) => onTier((e.target.value || null) as Tier | null)}
          >
            <option value="">Todas</option>
            {tiers.map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
      )}
      {offline && (
        <p className={sh.note}>
          Sem conexão e o álbum ainda não foi baixado. Abre de novo com internet.
        </p>
      )}
      {album && (
        <ul className={s.grid}>
          {filterByTier(album, tier).map((card) =>
            card.owned ? (
              <li key={card.n}>
                <button type="button" className={s.cell} onClick={() => onSelect(card)}>
                  <img
                    src={cardImage(card.img, 'low') ?? undefined}
                    alt={card.name}
                    loading="lazy"
                    crossOrigin="anonymous"
                  />
                </button>
              </li>
            ) : (
              <li key={card.n} className={s.missing} aria-label={`${card.n} ainda não`}>
                <img
                  src={cardImage(card.img, 'low') ?? undefined}
                  alt=""
                  loading="lazy"
                  crossOrigin="anonymous"
                />
              </li>
            ),
          )}
        </ul>
      )}
      {selected && selected.owned && (
        <CardSheet card={selected} owned={selected.owned} onClose={() => onSelect(null)} />
      )}
    </main>
  )
}
