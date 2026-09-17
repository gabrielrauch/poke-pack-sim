import { manifestHref, TOKEN, TOKEN_KEY, tokenFromLocation, urlWithoutToken } from './model'

let token: string | null = null
const listeners = new Set<() => void>()

/**
 * Uma vez, no bootstrap (§5): token da URL vai para o localStorage e sai da barra de endereço;
 * sem token na URL vale o salvo. Com token, o `<link rel="manifest">` passa a carregar ele.
 */
export function loadSession(): string | null {
  const fromUrl = tokenFromLocation(location.hash, location.search)
  if (fromUrl) {
    save(fromUrl)
    history.replaceState(null, '', urlWithoutToken(location.pathname, location.search))
  }
  token = fromUrl ?? read()
  if (token) linkManifest(token)
  return token
}

/** Token colado na tela de acesso: salva, aponta o manifest e avisa `useSession`. */
export function saveSession(t: string): void {
  save(t)
  token = t
  linkManifest(t)
  listeners.forEach((l) => l())
}

export const getToken = (): string | null => token

export function subscribeSession(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function linkManifest(t: string): void {
  document
    .querySelector<HTMLLinkElement>('link[rel="manifest"]')
    ?.setAttribute('href', manifestHref(t))
}

function read(): string | null {
  try {
    const t = localStorage.getItem(TOKEN_KEY)
    return t !== null && TOKEN.test(t) ? t : null
  } catch {
    return null
  }
}

function save(t: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, t)
  } catch {
    // modo privado sem storage: o token vive só nesta aba
  }
}
