import { useState, type FormEvent } from 'react'
import { ACCESS_TEXT, tokenFromPastedLink } from '../model'
import s from './auth.module.css'

/** Sem token salvo (ou com um que a API recusou): ela cola o link e entra (§5). */
export function AccessScreen({
  reason,
  onSubmit,
}: {
  reason: keyof typeof ACCESS_TEXT
  onSubmit: (token: string) => void
}) {
  const [text, setText] = useState('')
  const [bad, setBad] = useState(false)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const token = tokenFromPastedLink(text)
    if (token) onSubmit(token)
    else setBad(true)
  }
  const copy = ACCESS_TEXT[reason]
  return (
    <main className={s.access}>
      <h1>{copy.title}</h1>
      <p className={s.detail}>{copy.detail}</p>
      <form className={s.form} onSubmit={submit}>
        <label htmlFor="access-link">Link ou código</label>
        <input
          id="access-link"
          className={s.input}
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={text}
          aria-invalid={bad}
          onChange={(e) => {
            setText(e.target.value)
            setBad(false)
          }}
        />
        {bad && (
          <p className={s.bad} role="alert">
            Não achei o código nesse link.
          </p>
        )}
        <button type="submit" className={s.btn} disabled={text.trim() === ''}>
          Entrar
        </button>
      </form>
    </main>
  )
}
