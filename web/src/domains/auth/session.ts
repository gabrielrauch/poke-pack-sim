import { manifestHref, TOKEN, TOKEN_KEY, tokenFromLocation, urlWithoutToken } from './model'

let token: string | null = null

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
  if (token) {
    document
      .querySelector<HTMLLinkElement>('link[rel="manifest"]')
      ?.setAttribute('href', manifestHref(token))
  }
  return token
}

export const getToken = (): string | null => token

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
