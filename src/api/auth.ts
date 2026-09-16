/** SHA-256 hex do token; é o que fica em users.token_hash. Sem salt: o token já tem 256 bits de entropia. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
