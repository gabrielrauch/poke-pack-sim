import { createMiddleware } from 'hono/factory'
import { findUserByTokenHash, type UserRow } from '../db/users'
import type { AppEnv } from './env'

/** SHA-256 hex do token; é o que fica em users.token_hash. Sem salt: o token já tem 256 bits de entropia. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Tokens são 32 bytes em base64url (43 chars); a faixa folgada aceita tokens de teste. */
export const TOKEN = /^[A-Za-z0-9_-]{16,128}$/

export function bearerToken(header: string | undefined): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/)
  const token = match?.[1]
  return token !== undefined && TOKEN.test(token) ? token : null
}

export async function userForToken(db: D1Database, token: string | null): Promise<UserRow | null> {
  if (token === null) return null
  return findUserByTokenHash(db, await hashToken(token))
}

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const user = await userForToken(c.env.DB, bearerToken(c.req.header('Authorization')))
  if (!user) return c.json({ error: 'UNAUTHORIZED' }, 401)
  c.set('user', user)
  await next()
})
