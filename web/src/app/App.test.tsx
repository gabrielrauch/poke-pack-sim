import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { App } from './App'
import { createQueryClient } from './query'

it('sem token salvo mostra a tela de colar o link', () => {
  const html = renderToStaticMarkup(
    <QueryClientProvider client={createQueryClient()}>
      <App />
    </QueryClientProvider>,
  )
  expect(html).toContain('Colar link de acesso')
})
