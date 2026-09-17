import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import type { HistoryPack } from '../model'
import { HistoryView } from './HistoryView'
import { PackView } from './PackView'

const card = (n: string, tier: HistoryPack['cards'][number]['tier'], isNew = false) => ({
  n,
  name: `Carta ${n}`,
  tier,
  reverse: false,
  img: `https://assets.tcgdex.net/pt/sv/sv03.5/${n}`,
  new: isNew,
})
const hit: HistoryPack = {
  pack_id: 'p1',
  set_id: 'sv03.5',
  opened_at: '2026-09-17T21:00:00Z',
  hit: true,
  cards: [
    card('001', 'common', true),
    card('002', 'common'),
    card('003', 'common'),
    card('004', 'rare'),
    card('199', 'special_illustration_rare', true),
  ],
}

it('lista com minis, destaque de hit e link para reabrir', () => {
  const html = renderToStaticMarkup(
    <HistoryView packs={[hit]} hasMore onMore={() => {}} loadingMore={false} empty={false} />,
  )
  expect(html).toContain('href="/historico/p1"')
  expect(html).toContain('Puxada grande')
  expect(html).toContain('/api/img/pt/sv/sv03.5/199/low.webp')
  expect(html).toContain('Carregar mais')
})

it('vazio convida a abrir o primeiro', () => {
  const html = renderToStaticMarkup(
    <HistoryView packs={[]} hasMore={false} onMore={() => {}} loadingMore={false} empty />,
  )
  expect(html).toContain('Nenhum pacote aberto ainda')
  expect(html).toContain('href="/"')
})

it('reabertura em modo leitura mostra as 5 cartas com "Nova"', () => {
  const html = renderToStaticMarkup(<PackView pack={hit} />)
  expect(html).toContain('Que puxada!')
  expect((html.match(/>Nova</g) ?? []).length).toBe(2)
  expect(html).toContain('Rara Ilustração Especial')
})
