import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import type { AlbumCard } from '../model'
import { AlbumView } from './AlbumView'

const card = (n: string, owned: AlbumCard['owned']): AlbumCard => ({
  n,
  name: `Carta ${n}`,
  tier: 'common',
  reverse: true,
  img: `https://assets.tcgdex.net/pt/sv/sv03.5/${n}`,
  owned,
})
const album = [
  card('001', { normal: 1, reverse: 0, first: '2026-09-16T12:00:00Z' }),
  card('002', null),
]

it('mostra o set, o contador, a possuída como botão e a faltante em silhueta', () => {
  const html = renderToStaticMarkup(
    <AlbumView
      setName="151"
      album={album}
      tier={null}
      tiers={['common']}
      onTier={() => {}}
      selected={null}
      onSelect={() => {}}
      offline={false}
    />,
  )
  expect(html).toContain('151')
  expect(html).toContain('1/2')
  expect(html).toContain('/api/img/pt/sv/sv03.5/001/low.webp')
  expect(html).toContain('<button')
  expect(html).toContain('002 ainda não')
})

it('offline sem dados explica', () => {
  const html = renderToStaticMarkup(
    <AlbumView
      setName=""
      album={null}
      tier={null}
      tiers={[]}
      onTier={() => {}}
      selected={null}
      onSelect={() => {}}
      offline
    />,
  )
  expect(html).toContain('Sem conexão')
})
