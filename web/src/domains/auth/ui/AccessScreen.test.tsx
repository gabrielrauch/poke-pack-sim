import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { AccessScreen } from './AccessScreen'

it('mostra o título por motivo e o campo de colar', () => {
  const missing = renderToStaticMarkup(<AccessScreen reason="missing" onSubmit={() => {}} />)
  expect(missing).toContain('Colar link de acesso')
  expect(missing).toContain('id="access-link"')
  expect(missing).toContain('disabled')
  const invalid = renderToStaticMarkup(<AccessScreen reason="invalid" onSubmit={() => {}} />)
  expect(invalid).toContain('Esse link não vale mais')
})
