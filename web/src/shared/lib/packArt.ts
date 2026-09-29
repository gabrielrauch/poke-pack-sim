import { mulberry32 } from './prng'
import { designPack, extractPalette, type PackDesign, type Palette } from './packDesign'

/**
 * Arte procedural do booster (§3: `boosters` vem nulo), gerada a partir do logo do set: a paleta sai dos
 * pixels do logo e o motivo de fundo da semente do nome (`packDesign.ts`). O logo é o herói no centro e
 * se repete em marca d'água. Só canvas 2D; sem three, sem React.
 */
export type PackArtSource = { name: string; subtitle: string; logo: HTMLImageElement | null }

export const PACK_ASPECT = 1.62

export const FONT = "'Fredoka', system-ui, sans-serif"

type Ctx = CanvasRenderingContext2D

const BLUE = '#2b5fb7'
/** Lado da amostra do logo para a paleta (o bastante para as cores, barato de ler). */
const SAMPLE = 48

const palettes = new WeakMap<HTMLImageElement, Palette>()

/** Paleta do logo, uma vez por imagem. Canvas contaminado (sem CORS) ou sem logo → paleta vazia. */
export function logoPalette(logo: HTMLImageElement | null): Palette {
  if (!logo) return { swatches: [], ink: null }
  const cached = palettes.get(logo)
  if (cached) return cached
  let palette: Palette = { swatches: [], ink: null }
  try {
    const c = document.createElement('canvas')
    const scale = SAMPLE / Math.max(logo.naturalWidth, logo.naturalHeight, 1)
    c.width = Math.max(1, Math.round(logo.naturalWidth * scale))
    c.height = Math.max(1, Math.round(logo.naturalHeight * scale))
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.drawImage(logo, 0, 0, c.width, c.height)
      palette = extractPalette(ctx.getImageData(0, 0, c.width, c.height).data)
    }
  } catch {
    // SecurityError: segue com a paleta da semente.
  }
  palettes.set(logo, palette)
  return palette
}

/** A frente inteira, sem clip e sem boca (o `Pack` recorta e fatia). `h` deve ser `w × PACK_ASPECT`. */
export function drawPackArt(ctx: Ctx, w: number, h: number, art: PackArtSource): void {
  const d = designPack(art.name, logoPalette(art.logo))
  const heroY = h * 0.5
  drawFoil(ctx, w, h, d)
  drawMotif(ctx, w, h, d, heroY)
  if (art.logo) drawWatermark(ctx, w, h, art.logo, d)
  drawGlow(ctx, w * 0.5, heroY, w * 0.5, d.glow)
  drawHero(ctx, w, heroY, art, d)
  drawWordmark(ctx, w * 0.5, h * 0.125, w * 0.115)
  drawBand(ctx, w, h, art.subtitle, d)
  drawHairlines(ctx, w, h)
  drawEdges(ctx, w, h)
}

/**
 * Costura prensada como no booster real: a arte continua por baixo, uma fileira de barrinhas verticais
 * em relevo (cápsulas com luz de um lado e sombra do outro) e uma linha cinza horizontal na dobra.
 */
export function drawSeal(ctx: Ctx, w: number, barsY: number, barsH: number, lineY: number): void {
  const bw = w / 85
  const step = w / 51
  const r = bw / 2
  const o = w / 500
  ctx.save()
  ctx.lineWidth = Math.max(1, w / 700)
  for (let x = step * 0.6; x + bw < w; x += step) {
    ctx.strokeStyle = 'rgba(255,255,255,.7)'
    ctx.beginPath()
    ctx.roundRect(x - o, barsY - o, bw, barsH, r)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(20,20,40,.35)'
    ctx.beginPath()
    ctx.roundRect(x + o, barsY + o, bw, barsH, r)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,.14)'
    ctx.beginPath()
    ctx.roundRect(x, barsY, bw, barsH, r)
    ctx.fill()
  }
  const lh = Math.max(2, w / 260)
  ctx.fillStyle = 'rgba(30,30,50,.45)'
  ctx.fillRect(0, lineY, w, lh)
  ctx.fillStyle = 'rgba(255,255,255,.45)'
  ctx.fillRect(0, lineY + lh, w, lh * 0.6)
  ctx.restore()
}

/** Interior escuro sob a tira (aparece quando ela sai) e a sombra da dobra logo abaixo dela. */
export function drawMouth(ctx: Ctx, w: number, h: number, stripFrac: number): void {
  const end = stripFrac + 0.07
  const g = ctx.createLinearGradient(0, 0, 0, h * end)
  g.addColorStop(0, 'rgba(8,6,24,.97)')
  g.addColorStop(stripFrac / end, 'rgba(8,6,24,.97)')
  g.addColorStop(1, 'rgba(8,6,24,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h * end)
}

/** Foil tingido pela paleta: gradiente claro com uma faixa diagonal mais clara. */
function drawFoil(ctx: Ctx, w: number, h: number, d: PackDesign): void {
  const g = ctx.createLinearGradient(0, 0, w * 0.3, h)
  g.addColorStop(0, d.foil[0])
  g.addColorStop(0.5, d.foil[1])
  g.addColorStop(1, d.foil[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const sheen = ctx.createLinearGradient(0, h * 0.2, w, h * 0.8)
  sheen.addColorStop(0, 'rgba(255,255,255,0)')
  sheen.addColorStop(0.5, 'rgba(255,255,255,.55)')
  sheen.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, w, h)
}

/** Motivo de fundo nas cores do logo, centrado no herói. Determinístico pela semente do design. */
function drawMotif(ctx: Ctx, w: number, h: number, d: PackDesign, cy: number): void {
  const rnd = mulberry32(d.seed)
  const colors = [d.primary, d.secondary, d.accent]
  const cx = w / 2
  const reach = Math.hypot(w, h)
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, h * 0.8)
  ctx.clip()
  ctx.translate(cx, cy)
  ctx.rotate(d.angle)
  switch (d.motif) {
    case 'rays': {
      const n = 14 + Math.floor(rnd() * 10)
      ctx.globalAlpha = 0.32
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2
        const a1 = a0 + (Math.PI / n) * (0.6 + rnd() * 0.5)
        ctx.fillStyle = colors[i % colors.length]!
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, reach, a0, a1)
        ctx.closePath()
        ctx.fill()
      }
      break
    }
    case 'stripes': {
      const step = w * (0.09 + rnd() * 0.05)
      ctx.globalAlpha = 0.3
      for (let x = -reach, i = 0; x < reach; x += step, i++) {
        ctx.fillStyle = colors[i % colors.length]!
        ctx.fillRect(x, -reach, step * (0.35 + rnd() * 0.3), reach * 2)
      }
      break
    }
    case 'halftone': {
      const step = w * 0.05
      ctx.globalAlpha = 0.4
      for (let y = -reach / 2; y < reach / 2; y += step) {
        for (let x = -reach / 2; x < reach / 2; x += step) {
          const r = step * 0.46 * Math.min(1, Math.hypot(x, y) / (w * 0.75))
          if (r < 0.5) continue
          ctx.fillStyle = colors[Math.floor(Math.abs(x + y * 1.7) / step) % colors.length]!
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'shards': {
      ctx.globalAlpha = 0.34
      for (let i = 0; i < 26; i++) {
        const a = rnd() * Math.PI * 2
        const r0 = w * (0.2 + rnd() * 0.5)
        const len = w * (0.25 + rnd() * 0.45)
        const spread = 0.08 + rnd() * 0.14
        ctx.fillStyle = colors[i % colors.length]!
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0)
        ctx.lineTo(Math.cos(a - spread) * (r0 + len), Math.sin(a - spread) * (r0 + len))
        ctx.lineTo(Math.cos(a + spread) * (r0 + len), Math.sin(a + spread) * (r0 + len))
        ctx.closePath()
        ctx.fill()
      }
      break
    }
    case 'rings': {
      const step = w * (0.07 + rnd() * 0.04)
      ctx.globalAlpha = 0.34
      ctx.lineWidth = step * 0.38
      for (let r = step, i = 0; r < reach; r += step, i++) {
        ctx.strokeStyle = colors[i % colors.length]!
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    }
  }
  ctx.restore()
}

/** O próprio logo repetido pequeno em fileiras inclinadas, bem apagado (textura do foil). */
function drawWatermark(
  ctx: Ctx,
  w: number,
  h: number,
  logo: HTMLImageElement,
  d: PackDesign,
): void {
  const lw = w * 0.22
  const lh = (lw * logo.naturalHeight) / Math.max(1, logo.naturalWidth)
  const stepX = lw * 1.35
  const stepY = Math.max(lh, w * 0.05) * 1.9
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, h * 0.8)
  ctx.clip()
  ctx.globalAlpha = 0.1
  ctx.translate(w / 2, h / 2)
  ctx.rotate(-d.angle / 2 - 0.2)
  for (let y = -h, row = 0; y < h; y += stepY, row++) {
    for (let x = -h + (row % 2) * (stepX / 2); x < h; x += stepX) {
      ctx.drawImage(logo, x, y, lw, lh)
    }
  }
  ctx.restore()
}

/** Clareia o centro para o motivo não brigar com o logo. */
function drawGlow(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, 'rgba(255,255,255,.95)')
  g.addColorStop(0.5, color)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.save()
  ctx.globalAlpha = 0.85
  ctx.fillStyle = g
  ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
  ctx.restore()
}

/** Logo grande no centro (até 80% da largura e 30% da altura) com halo na cor de destaque; sem logo, o nome. */
function drawHero(ctx: Ctx, w: number, cy: number, art: PackArtSource, d: PackDesign): void {
  ctx.save()
  if (art.logo) {
    let lw = w * 0.8
    let lh = (lw * art.logo.naturalHeight) / Math.max(1, art.logo.naturalWidth)
    const maxH = w * PACK_ASPECT * 0.3
    if (lh > maxH) {
      lw *= maxH / lh
      lh = maxH
    }
    const x = (w - lw) / 2
    const y = cy - lh / 2
    ctx.shadowColor = d.accent
    ctx.shadowBlur = w * 0.06
    ctx.drawImage(art.logo, x, y, lw, lh)
    ctx.shadowColor = 'rgba(0,0,0,.3)'
    ctx.shadowBlur = w * 0.02
    ctx.shadowOffsetY = w * 0.008
    ctx.drawImage(art.logo, x, y, lw, lh)
  } else {
    const size = w * 0.16
    ctx.font = `700 ${size}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.shadowColor = d.accent
    ctx.shadowBlur = w * 0.05
    ctx.strokeStyle = d.ink
    ctx.lineWidth = size * 0.16
    ctx.strokeText(art.name, w / 2, cy, w * 0.86)
    ctx.shadowBlur = 0
    ctx.fillStyle = d.primary
    ctx.fillText(art.name, w / 2, cy, w * 0.86)
  }
  ctx.restore()
}

/** "Pokémon" amarelo com contorno azul e "TCG" menor, alinhado à direita, embaixo. */
function drawWordmark(ctx: Ctx, cx: number, cy: number, size: number): void {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.font = `700 ${size}px ${FONT}`
  ctx.strokeStyle = BLUE
  ctx.lineWidth = size * 0.18
  ctx.strokeText('Pokémon', cx, cy)
  ctx.fillStyle = '#ffcb05'
  ctx.fillText('Pokémon', cx, cy)
  const right = cx + ctx.measureText('Pokémon').width / 2
  ctx.font = `700 ${size * 0.34}px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillStyle = BLUE
  ctx.fillText('TCG', right, cy + size * 0.62)
  ctx.restore()
}

/** Faixa do rodapé na cor principal escurecida, com filete na cor de destaque e o subtítulo. */
function drawBand(ctx: Ctx, w: number, h: number, subtitle: string, d: PackDesign): void {
  const y0 = h * 0.8
  const y1 = h * 0.93
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  g.addColorStop(0, d.band[0])
  g.addColorStop(1, d.band[1])
  ctx.fillStyle = g
  ctx.fillRect(0, y0, w, y1 - y0)
  ctx.fillStyle = d.trim
  ctx.fillRect(0, y0, w, h * 0.006)
  ctx.fillStyle = '#fff'
  ctx.font = `600 ${w * 0.055}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(subtitle, w / 2, (y0 + y1) / 2)
}

/** Textura escovada do foil, por cima de tudo, bem sutil (some no mip da tela e sobra como brilho). */
function drawHairlines(ctx: Ctx, w: number, h: number): void {
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate((10 * Math.PI) / 180)
  ctx.lineWidth = 1
  for (const [offset, color] of [
    [0, 'rgba(255,255,255,.18)'],
    [2.5, 'rgba(30,30,60,.05)'],
  ] as const) {
    ctx.strokeStyle = color
    for (let x = -h + offset; x < h; x += 5) {
      ctx.beginPath()
      ctx.moveTo(x, -h)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/** Dobras laterais: escurece de leve as duas bordas (a geometria dá o resto). */
function drawEdges(ctx: Ctx, w: number, h: number): void {
  const l = ctx.createLinearGradient(0, 0, w * 0.08, 0)
  l.addColorStop(0, 'rgba(0,0,0,.12)')
  l.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = l
  ctx.fillRect(0, 0, w * 0.08, h)
  const r = ctx.createLinearGradient(w, 0, w * 0.92, 0)
  r.addColorStop(0, 'rgba(0,0,0,.16)')
  r.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = r
  ctx.fillRect(w * 0.92, 0, w * 0.08, h)
}

/** Frente inteira e chapada (Início): arte + costuras de cima e de baixo, os mesmos números do Pack.ts. */
export function drawPackFront(ctx: Ctx, w: number, h: number, art: PackArtSource): void {
  drawPackArt(ctx, w, h, art)
  const strip = h * 0.21
  drawSeal(ctx, w, strip * 0.04, strip * 0.14, strip * 0.2)
  drawSeal(ctx, w, h * 0.962, h * 0.03, h * 0.955)
}
