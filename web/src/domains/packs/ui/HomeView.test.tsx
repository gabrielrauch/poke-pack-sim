import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { HomeView } from './HomeView'

const me = {
  id: 'u1',
  name: 'Ela',
  packs_available: 3,
  next_refill_at: '2026-09-17T21:00:00Z',
  total_packs: 12,
  packs_since_hit: 2,
  favorites: [],
}

it('com pacotes: saudação, contador e botão para /abrir', () => {
  const html = renderToStaticMarkup(
    <HomeView me={me} art={null} logo={null} failure={null} onRetry={() => {}} />,
  )
  expect(html).toContain('Olá, Ela')
  expect(html).toContain('3 pacotes para abrir')
  expect(html).toContain('href="/abrir"')
  expect(html).toContain('12 pacotes abertos')
})

it('sem pacotes: pacote apagado e botão desabilitado', () => {
  const html = renderToStaticMarkup(
    <HomeView
      me={{ ...me, packs_available: 0 }}
      art={null}
      logo={null}
      failure={null}
      onRetry={() => {}}
    />,
  )
  expect(html).toContain('Sem pacotes agora')
  expect(html).toContain('disabled')
  expect(html).not.toContain('href="/abrir"')
})

it('erro: mostra o texto e o botão de tentar de novo', () => {
  const html = renderToStaticMarkup(
    <HomeView
      me={null}
      art={null}
      logo={null}
      failure={{ title: 'Sem conexão', detail: 'x', retry: true }}
      onRetry={() => {}}
    />,
  )
  expect(html).toContain('Sem conexão')
  expect(html).toContain('Tentar de novo')
  expect(html).not.toContain('href="/abrir"')
})
