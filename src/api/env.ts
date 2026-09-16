import type { UserRow } from '../db/users'
import type { CardProvider } from '../provider/types'

export type AppEnv = { Bindings: Env; Variables: { user: UserRow } }

/** Ids do TCGdex: `sv03.5`, `swsh12`, `me01`. Evita mandar lixo para o filtro por prefixo do GraphQL. */
export const SET_ID = /^[a-z0-9]{1,12}(?:\.[0-9]{1,3})?$/

export type AppDeps = {
  provider: CardProvider
  /** Relógio injetável; os testes fixam a data para recarga e `next_refill_at`. */
  now?: () => Date
  /** `fetch` das imagens do TCGdex (GET /api/img/*); os testes injetam um stub. */
  fetchImage?: typeof fetch
}
