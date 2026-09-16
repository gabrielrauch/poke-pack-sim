export type ThemeColors = { bg: string; bg2: string; gold: string; rose: string; violet: string }

const FALLBACK: ThemeColors = {
  bg: '#15123a',
  bg2: '#2b2273',
  gold: '#f6c744',
  rose: '#ff7fb6',
  violet: '#9a7cff',
}

/** Lê as CSS vars do tema uma vez (a engine não conhece CSS). */
export function readThemeColors(): ThemeColors {
  if (typeof document === 'undefined') return FALLBACK
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    bg: read('--bg', FALLBACK.bg),
    bg2: read('--bg-2', FALLBACK.bg2),
    gold: read('--gold', FALLBACK.gold),
    rose: read('--rose', FALLBACK.rose),
    violet: read('--violet', FALLBACK.violet),
  }
}

/** `#rgb`/`#rrggbb` → `rgba(r,g,b,a)`. Outros formatos voltam como estão (alpha ignorado). */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return color
  let hex = m[1]!
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c)
  const n = parseInt(hex, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}
