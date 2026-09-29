/**
 * Design procedural do booster a partir do logo do set: paleta extraída dos pixels do logo + um motivo
 * escolhido pela semente do nome. Puro (sem canvas): quem desenha é `packArt.ts`.
 */
export type Rgb = readonly [number, number, number]

export type Palette = {
  /** Cores cromáticas do logo, da mais marcante para a menos (no máximo 4, matizes distintos). */
  swatches: Rgb[]
  /** Cor escura mais frequente (contorno do logo), se houver. */
  ink: Rgb | null
}

export const MOTIFS = ['rays', 'stripes', 'halftone', 'shards', 'rings'] as const
export type Motif = (typeof MOTIFS)[number]

export type PackDesign = {
  seed: number
  motif: Motif
  /** Ângulo do motivo em radianos. */
  angle: number
  /** Foil: três paradas claras tingidas pela cor principal. */
  foil: [string, string, string]
  primary: string
  secondary: string
  accent: string
  ink: string
  /** Faixa do rodapé: escura o bastante para o texto branco. */
  band: [string, string]
  /** Filete da faixa. */
  trim: string
  /** Brilho atrás do logo. */
  glow: string
}

/** FNV-1a de 32 bits: a mesma string dá sempre o mesmo pacote. */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** HSL com h em graus [0, 360), s e l em [0, 1]. */
export function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = ((gn - bn) / d + 6) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [h * 60, s, l]
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const [r, g, b] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x]
  const m = l - c / 2
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

export function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Mistura linear: `t = 0` é `a`, `t = 1` é `b`. */
export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

/** Mesma matiz e saturação com outra luminosidade. */
export function withLightness(c: Rgb, l: number): Rgb {
  const [h, s] = rgbToHsl(c)
  return hslToRgb(h, s, l)
}

const WHITE: Rgb = [255, 255, 255]
const BINS = 24
/** Matizes mais próximas que isso contam como a mesma cor. */
const MIN_HUE_GAP = 35

const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/**
 * Paleta a partir de pixels RGBA (o `data` de um `ImageData` pequeno). Ignora transparente, cinzas e
 * quase branco; agrupa por matiz, pontua por quantidade × saturação e fica com matizes bem separadas.
 */
export function extractPalette(data: ArrayLike<number>): Palette {
  const bins = Array.from({ length: BINS }, () => ({ score: 0, r: 0, g: 0, b: 0, n: 0 }))
  const dark = { r: 0, g: 0, b: 0, n: 0 }
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3]! < 128) continue
    const rgb: Rgb = [data[i]!, data[i + 1]!, data[i + 2]!]
    const [h, s, l] = rgbToHsl(rgb)
    if (l < 0.22) {
      dark.r += rgb[0]
      dark.g += rgb[1]
      dark.b += rgb[2]
      dark.n++
      continue
    }
    if (s < 0.25 || l > 0.9) continue
    const bin = bins[Math.floor(h / (360 / BINS)) % BINS]!
    bin.score += 0.4 + s
    bin.r += rgb[0]
    bin.g += rgb[1]
    bin.b += rgb[2]
    bin.n++
  }
  const ranked = bins
    .filter((b) => b.n > 0)
    .sort((a, b) => b.score - a.score)
    .map((b): Rgb => [Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)])
  const swatches: Rgb[] = []
  for (const c of ranked) {
    const h = rgbToHsl(c)[0]
    if (swatches.every((sw) => hueGap(rgbToHsl(sw)[0], h) >= MIN_HUE_GAP)) swatches.push(c)
    if (swatches.length === 4) break
  }
  const ink: Rgb | null =
    dark.n > 0
      ? [Math.round(dark.r / dark.n), Math.round(dark.g / dark.n), Math.round(dark.b / dark.n)]
      : null
  return { swatches, ink }
}

/** Completa a paleta até 3 cores: a partir da principal (ou da semente) em tríade. */
function fillSwatches(swatches: Rgb[], seed: number): [Rgb, Rgb, Rgb] {
  const base = swatches[0] ?? hslToRgb(seed % 360, 0.7, 0.5)
  const [h] = rgbToHsl(base)
  const second = swatches[1] ?? hslToRgb(h + 150, 0.65, 0.55)
  const third = swatches[2] ?? hslToRgb(h + 210, 0.75, 0.6)
  return [base, second, third]
}

/** Amarelos escurecidos viram oliva: a faixa usa a primeira cor fora dessa faixa de matiz. */
function bandColor(colors: Rgb[]): Rgb {
  return (
    colors.find((c) => {
      const [h] = rgbToHsl(c)
      return h < 40 || h > 80
    }) ?? colors[0]!
  )
}

/** O design completo do pacote: mesma paleta + mesmo nome → mesmo pacote. */
export function designPack(name: string, palette: Palette): PackDesign {
  const seed = hashString(name)
  const [primary, secondary, accent] = fillSwatches(palette.swatches, seed)
  const [h, s] = rgbToHsl(primary)
  const deep = bandColor([primary, secondary, accent])
  const ink = palette.ink ?? hslToRgb(h, Math.min(0.6, s), 0.16)
  return {
    seed,
    motif: MOTIFS[seed % MOTIFS.length]!,
    angle: (((seed >>> 8) % 60) - 30) * (Math.PI / 180),
    foil: [
      toHex(mix(primary, WHITE, 0.88)),
      toHex(mix(primary, WHITE, 0.7)),
      toHex(mix(secondary, WHITE, 0.76)),
    ],
    primary: toHex(primary),
    secondary: toHex(secondary),
    accent: toHex(accent),
    ink: toHex(ink),
    band: [
      toHex(withLightness(deep, 0.42)),
      toHex(withLightness(deep, Math.min(0.26, rgbToHsl(deep)[2]))),
    ],
    trim: toHex(withLightness(accent, 0.65)),
    glow: toHex(mix(secondary, WHITE, 0.7)),
  }
}
