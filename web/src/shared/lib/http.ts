/** Resposta fora de 2xx (`{ error: 'CODE', ... }` da API). Falha de rede continua sendo o `TypeError` do fetch. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly body: unknown,
  ) {
    super(`${status} ${code}`)
    this.name = 'ApiError'
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST'
  /** Serializado como JSON. */
  body?: unknown
  token?: string | null
}

/** JSON da mesma origem, `Authorization: Bearer` quando há token. `fetchImpl` é injetável para os testes. */
export async function request<T>(
  path: string,
  { method = 'GET', body, token = null }: RequestOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const init: RequestInit = { method, headers }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const res = await fetchImpl(path, init)
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, errorCode(json, res.status), json)
  return json as T
}

function errorCode(json: unknown, status: number): string {
  if (typeof json === 'object' && json !== null) {
    const { error } = json as { error?: unknown }
    if (typeof error === 'string') return error
  }
  return `HTTP_${status}`
}
