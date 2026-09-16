import type { RefObject } from 'react'
import s from './opening.module.css'

export function Hint({ text, ref }: { text: string; ref?: RefObject<HTMLElement | null> }) {
  return (
    <footer ref={ref} className={s.hint} aria-live="polite">
      {text}
    </footer>
  )
}
