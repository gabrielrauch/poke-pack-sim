import { PATHS, usePathname } from '../lib/router'
import { Link } from './Link'
import s from './shared.module.css'

const TABS = [
  { to: PATHS.home, label: 'Início', d: 'M3 11 12 3l9 8v10h-6v-6H9v6H3z' },
  { to: PATHS.album, label: 'Álbum', d: 'M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z' },
  {
    to: PATHS.history,
    label: 'Histórico',
    d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1 3h2v5.6l3.4 2-1 1.7L11 13.5z',
  },
] as const

/** Barra fixa embaixo: Início, Álbum, Histórico. A abertura não tem barra (§7.1). */
export function TabBar() {
  const path = usePathname()
  return (
    <nav className={s.tabs} aria-label="Seções">
      {TABS.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className={s.tab}
          aria-current={path === t.to ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={t.d} />
          </svg>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  )
}
