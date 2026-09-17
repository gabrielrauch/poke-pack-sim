import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { App } from './App'

it('renders the home with the link to open a pack', () => {
  const html = renderToStaticMarkup(<App />)
  expect(html).toContain('pack-sim')
  expect(html).toContain('href="/abrir"')
})
