import type { Tier } from '../catalog/model'

/** Carta como `POST /api/packs` devolve (e como fica gravada em `packs.cards`). */
export type PackCard = {
  n: string
  name: string
  tier: Tier
  reverse: boolean
  img: string | null
  new: boolean
}
