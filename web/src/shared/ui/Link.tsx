import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { isPlainClick, navigate } from '../lib/router'

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string
  replace?: boolean
}

/** `<a>` interno: clique simples vira pushState; com modificador ou `target` o navegador segue o href. */
export function Link({ to, replace = false, onClick, ...rest }: Props) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (!isPlainClick(e) || (rest.target && rest.target !== '_self')) return
    e.preventDefault()
    navigate(to, replace)
  }
  return <a href={to} onClick={handle} {...rest} />
}
