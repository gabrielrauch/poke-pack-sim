import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { App } from './App'

it('renders the app shell', () => {
  const html = renderToStaticMarkup(<App />)
  expect(html).toContain('pack-sim')
})
