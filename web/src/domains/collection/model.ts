import { TIER_ORDER, type Card, type Tier } from '../catalog/model'

/** `GET /api/collection/:set` (§5): contagens e data da primeira puxada por número. */
export type Owned = { normal: number; reverse: number; first: string }
export type Collection = Record<string, Owned>
export type AlbumCard = Card & { owned: Owned | null }

const byNumber = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })

/** Catálogo em ordem numérica com o que ela tem de cada carta. */
export function buildAlbum(cards: readonly Card[], owned: Collection): AlbumCard[] {
  return [...cards]
    .sort((a, b) => byNumber(a.n, b.n))
    .map((c) => ({ ...c, owned: owned[c.n] ?? null }))
}

export const ownedCount = (album: readonly AlbumCard[]): number =>
  album.filter((c) => c.owned !== null).length

/** `43/207`: cartas distintas possuídas sobre o total do set. */
export const progressText = (album: readonly AlbumCard[]): string =>
  `${ownedCount(album)}/${album.length}`

export function tiersIn(album: readonly AlbumCard[]): Tier[] {
  const present = new Set(album.map((c) => c.tier))
  return TIER_ORDER.filter((t) => present.has(t))
}

export function filterByTier(album: readonly AlbumCard[], tier: Tier | null): AlbumCard[] {
  return tier ? album.filter((c) => c.tier === tier) : [...album]
}

export function countsText(o: Owned): string {
  const parts: string[] = []
  if (o.normal > 0) parts.push(o.normal === 1 ? '1 normal' : `${o.normal} normais`)
  if (o.reverse > 0) parts.push(`${o.reverse} reverse`)
  return parts.join(' · ')
}

export function firstPulledText(iso: string, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  if (timeZone) opts.timeZone = timeZone
  return `Primeira em ${new Intl.DateTimeFormat('pt-BR', opts).format(new Date(iso))}`
}
