import { expect, it } from 'vitest'
import {
  designPack,
  extractPalette,
  hashString,
  hslToRgb,
  MOTIFS,
  mix,
  rgbToHsl,
  toHex,
  withLightness,
  type Rgb,
} from './packDesign'

/** Pixels RGBA: cada entrada é [cor, quantas vezes, alpha]. */
function pixels(...runs: Array<[Rgb, number, number?]>): Uint8ClampedArray {
  const out: number[] = []
  for (const [[r, g, b], n, a = 255] of runs) for (let i = 0; i < n; i++) out.push(r, g, b, a)
  return new Uint8ClampedArray(out)
}

const luminance = (hex: string) =>
  rgbToHsl([1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb)[2]

it('hash estável e diferente por nome', () => {
  expect(hashString('151')).toBe(hashString('151'))
  expect(hashString('151')).not.toBe(hashString('Obsidian Flames'))
  expect(hashString('')).toBe(0x811c9dc5)
})

it('HSL ida e volta nas seis faixas de matiz e no cinza', () => {
  for (const c of [
    [230, 40, 40],
    [220, 200, 30],
    [40, 200, 60],
    [30, 190, 200],
    [40, 60, 220],
    [200, 40, 190],
    [128, 128, 128],
  ] as Rgb[]) {
    const [h, s, l] = rgbToHsl(c)
    const back = hslToRgb(h, s, l)
    back.forEach((v, i) => expect(Math.abs(v - c[i]!)).toBeLessThanOrEqual(1))
  }
  expect(rgbToHsl([128, 128, 128])[1]).toBe(0)
})

it('hex, mistura e luminosidade', () => {
  expect(toHex([255, 8, 0])).toBe('#ff0800')
  expect(mix([0, 0, 0], [255, 255, 255], 0.5)).toEqual([128, 128, 128])
  expect(rgbToHsl(withLightness([230, 40, 40], 0.3))[2]).toBeCloseTo(0.3, 1)
})

it('paleta: ignora transparente, cinza e branco; ordena por presença; separa matizes', () => {
  const p = extractPalette(
    pixels(
      [[255, 255, 255], 500],
      [[120, 120, 120], 300],
      [[0, 200, 0], 400, 0],
      [[230, 40, 40], 200],
      [[235, 50, 45], 60], // mesma matiz do vermelho: não vira outra amostra
      [[250, 200, 20], 120],
      [[40, 80, 220], 50],
      [[20, 20, 30], 80],
    ),
  )
  expect(p.swatches).toHaveLength(3)
  expect(rgbToHsl(p.swatches[0]!)[0]).toBeLessThan(10)
  expect(rgbToHsl(p.swatches[1]!)[0]).toBeGreaterThan(40)
  expect(rgbToHsl(p.swatches[2]!)[0]).toBeGreaterThan(200)
  expect(p.ink).toEqual([20, 20, 30])
})

it('paleta: no máximo quatro cores e sem tinta quando não há escuro', () => {
  const hues = [0, 60, 120, 180, 240, 300]
  const p = extractPalette(
    pixels(...hues.map((h, i): [Rgb, number] => [hslToRgb(h, 0.8, 0.5), 10 + i])),
  )
  expect(p.swatches).toHaveLength(4)
  expect(p.ink).toBeNull()
  expect(extractPalette(new Uint8ClampedArray(0))).toEqual({ swatches: [], ink: null })
})

it('design: usa as cores do logo, determinístico pelo nome', () => {
  const palette = {
    swatches: [
      [230, 40, 40],
      [250, 200, 20],
      [40, 80, 220],
    ] as Rgb[],
    ink: [20, 20, 30] as Rgb,
  }
  const d = designPack('151', palette)
  expect(d).toEqual(designPack('151', palette))
  expect(d.primary).toBe('#e62828')
  expect(d.secondary).toBe('#fac814')
  expect(d.accent).toBe('#2850dc')
  expect(d.ink).toBe('#14141e')
  expect(MOTIFS).toContain(d.motif)
  expect(Math.abs(d.angle)).toBeLessThanOrEqual(Math.PI / 6)
  // Faixa escura o bastante para o subtítulo branco; foil claro.
  for (const c of d.band) expect(luminance(c)).toBeLessThanOrEqual(0.43)
  for (const c of d.foil) expect(luminance(c)).toBeGreaterThan(0.85)
})

it('design: sem logo a paleta vem da semente, e nomes diferentes variam o motivo', () => {
  const d = designPack('Sem Logo', { swatches: [], ink: null })
  expect(d.primary).toMatch(/^#[0-9a-f]{6}$/)
  expect(d.secondary).not.toBe(d.primary)
  expect(d.accent).not.toBe(d.secondary)
  expect(luminance(d.ink)).toBeLessThan(0.2)
  const motifs = new Set(
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map(
      (n) => designPack(n, { swatches: [], ink: null }).motif,
    ),
  )
  expect(motifs.size).toBeGreaterThan(2)
})
