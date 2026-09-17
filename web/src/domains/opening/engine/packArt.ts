import { mulberry32 } from './packMath'

/**
 * Arte procedural do booster (§3: `boosters` vem nulo). Inspirada no 151: foil branco, silhuetas
 * coloridas, Mew com Pokébola, logotipo no topo, faixa vermelha. Só canvas 2D; sem three, sem React.
 */
export type PackArtSource = { name: string; subtitle: string; logo: HTMLImageElement | null }

export const FONT = "'Fredoka', system-ui, sans-serif"

type Ctx = CanvasRenderingContext2D

const PINK = '#f7bddc'
const PINK_DARK = '#e08fc1'
const EYE = '#3b4fb8'
const BLUE = '#2b5fb7'
const CONFETTI = ['#ff9ec7', '#8fd0ff', '#ffd166', '#9be7b0', '#c9a8ff', '#ffb27a']

/** A frente inteira, sem clip e sem boca (o `Pack` recorta e fatia). `h` deve ser `w × PACK_ASPECT`. */
export function drawPackArt(ctx: Ctx, w: number, h: number, art: PackArtSource): void {
  drawFoil(ctx, w, h)
  drawConfetti(ctx, w, h, mulberry32(151))
  drawGlow(ctx, w * 0.5, h * 0.47, w * 0.42)
  drawPokeball(ctx, w * 0.5, h * 0.56, w * 0.19)
  drawMew(ctx, w * 0.55, h * 0.37, w * 0.17)
  drawWordmark(ctx, w * 0.5, h * 0.125, w * 0.115)
  drawSetLogo(ctx, w, h, art)
  drawBand(ctx, w, h, art.subtitle)
  drawHairlines(ctx, w, h)
  drawEdges(ctx, w, h)
}

/** Costura prensada: ranhuras finas claras sobre um leve escurecimento (o relevo do crimp). */
export function drawCrimp(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(0,0,0,.14)'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = 'rgba(255,255,255,.55)'
  const step = w / 46
  for (let i = 0; i < w; i += step) ctx.fillRect(x + i, y, step * 0.45, h)
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

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
  ctx.fill()
}

function circle(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

/** Foil branco: gradiente frio com uma faixa diagonal mais clara. */
function drawFoil(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, w * 0.3, h)
  g.addColorStop(0, '#fbfcff')
  g.addColorStop(0.45, '#e9ecf4')
  g.addColorStop(0.7, '#f6f7fb')
  g.addColorStop(1, '#dde2ec')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const sheen = ctx.createLinearGradient(0, h * 0.2, w, h * 0.8)
  sheen.addColorStop(0, 'rgba(255,255,255,0)')
  sheen.addColorStop(0.5, 'rgba(255,255,255,.55)')
  sheen.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, w, h)
}

/** Formas unitárias (raio 1) na origem; só o caminho, quem chama faz `beginPath`/`fill`. */
const SHAPES: ReadonlyArray<(ctx: Ctx) => void> = [
  (ctx) => {
    // criatura: cabeça redonda com duas orelhas
    ctx.arc(0, 0.1, 0.85, 0, Math.PI * 2)
    ctx.moveTo(-0.7, -0.4)
    ctx.lineTo(-0.85, -1.1)
    ctx.lineTo(-0.15, -0.75)
    ctx.moveTo(0.7, -0.4)
    ctx.lineTo(0.85, -1.1)
    ctx.lineTo(0.15, -0.75)
  },
  (ctx) => {
    // estrela
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.45 : 1
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
  },
  (ctx) => {
    // gota / chama
    ctx.moveTo(0, -1)
    ctx.bezierCurveTo(0.9, -0.1, 0.9, 0.9, 0, 0.9)
    ctx.bezierCurveTo(-0.9, 0.9, -0.9, -0.1, 0, -1)
  },
  (ctx) => {
    // folha
    ctx.moveTo(-1, 0.6)
    ctx.quadraticCurveTo(-0.2, -1.2, 1, -0.7)
    ctx.quadraticCurveTo(0.6, 0.9, -1, 0.6)
  },
  (ctx) => {
    // anel (Pokébola vista de longe): círculo com furo (sentido inverso)
    ctx.arc(0, 0, 1, 0, Math.PI * 2)
    ctx.moveTo(0.4, 0)
    ctx.arc(0, 0, 0.4, 0, Math.PI * 2, true)
  },
]

/** As "silhuetas dos 151": grid hexagonal com jitter, cores pastel, alpha baixo. Determinístico pelo `rnd`. */
function drawConfetti(ctx: Ctx, w: number, h: number, rnd: () => number): void {
  const cell = w * 0.085
  ctx.save()
  ctx.globalAlpha = 0.3
  for (let row = 0, y = h * 0.04; y < h * 0.78; row++, y += cell * 0.9) {
    for (let x = (row % 2 ? cell * 0.5 : 0) + cell * 0.2; x < w; x += cell) {
      const shape = SHAPES[Math.floor(rnd() * SHAPES.length)]!
      const size = cell * (0.2 + rnd() * 0.13)
      ctx.save()
      ctx.translate(x + (rnd() - 0.5) * cell * 0.5, y + (rnd() - 0.5) * cell * 0.5)
      ctx.rotate(rnd() * Math.PI * 2)
      ctx.scale(size, size)
      ctx.fillStyle = CONFETTI[Math.floor(rnd() * CONFETTI.length)]!
      ctx.beginPath()
      shape(ctx)
      ctx.fill()
      ctx.restore()
    }
  }
  ctx.restore()
}

/** Clareia o centro para o confete não brigar com a arte principal. */
function drawGlow(ctx: Ctx, cx: number, cy: number, r: number): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, 'rgba(255,255,255,.95)')
  g.addColorStop(0.55, 'rgba(255,225,242,.75)')
  g.addColorStop(1, 'rgba(255,225,242,0)')
  ctx.fillStyle = g
  ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
}

function drawPokeball(ctx: Ctx, cx: number, cy: number, r: number): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.fillStyle = 'rgba(60,30,90,.16)'
  ellipse(ctx, r * 0.05, r * 0.92, r * 0.95, r * 0.2)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.clip()
  const top = ctx.createLinearGradient(0, -r, 0, 0)
  top.addColorStop(0, '#ff6a5c')
  top.addColorStop(1, '#c81e1e')
  ctx.fillStyle = top
  ctx.fillRect(-r, -r, 2 * r, r)
  const bottom = ctx.createLinearGradient(0, 0, 0, r)
  bottom.addColorStop(0, '#ffffff')
  bottom.addColorStop(1, '#d4d9e4')
  ctx.fillStyle = bottom
  ctx.fillRect(-r, 0, 2 * r, r)
  ctx.fillStyle = '#24232c'
  ctx.fillRect(-r, -r * 0.09, 2 * r, r * 0.18)
  circle(ctx, 0, 0, r * 0.3, '#24232c')
  circle(ctx, 0, 0, r * 0.21, '#ffffff')
  circle(ctx, 0, 0, r * 0.12, '#e2e6ef')
  ctx.fillStyle = 'rgba(255,255,255,.55)'
  ellipse(ctx, -r * 0.35, -r * 0.55, r * 0.3, r * 0.14, -0.6)
  ctx.restore()
}

/**
 * Mew estilizado em coordenadas unitárias (y para baixo, cabeça em cima, pés em ~0.55, orelhas em −1),
 * escalado por `s`. Ordem: cauda atrás, pés, corpo, braços, orelhas, cabeça (cobre a base das orelhas), olhos.
 */
function drawMew(ctx: Ctx, cx: number, cy: number, s: number): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(s, s)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = PINK
  ctx.lineWidth = 0.14
  ctx.beginPath()
  ctx.moveTo(0.28, 0.42)
  ctx.bezierCurveTo(0.9, 0.62, 1.25, 0.05, 0.8, -0.3)
  ctx.bezierCurveTo(0.6, -0.46, 0.46, -0.24, 0.62, -0.16)
  ctx.stroke()
  ctx.fillStyle = PINK
  ctx.strokeStyle = PINK_DARK
  ctx.lineWidth = 0.035
  const part = (x: number, y: number, rx: number, ry: number, rot: number) => {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  part(-0.14, 0.53, 0.18, 0.1, -0.25)
  part(0.24, 0.55, 0.18, 0.1, 0.25)
  part(0.04, 0.2, 0.28, 0.36, 0.1)
  part(-0.28, 0.1, 0.08, 0.17, 0.5)
  part(0.32, 0.06, 0.08, 0.17, -0.5)
  for (const d of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(d * 0.3, -0.5)
    ctx.quadraticCurveTo(d * 0.52, -0.85, d * 0.46, -1.02)
    ctx.quadraticCurveTo(d * 0.3, -0.82, d * 0.08, -0.62)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  part(0, -0.35, 0.44, 0.37, 0)
  ctx.fillStyle = EYE
  ellipse(ctx, -0.17, -0.36, 0.075, 0.11)
  ellipse(ctx, 0.17, -0.36, 0.075, 0.11)
  ctx.fillStyle = '#fff'
  ellipse(ctx, -0.19, -0.4, 0.025, 0.035)
  ellipse(ctx, 0.15, -0.4, 0.025, 0.035)
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

/** Logo do set (imagem do catálogo, limitada a 34% da largura e 15% de altura) ou o nome. */
function drawSetLogo(ctx: Ctx, w: number, h: number, art: PackArtSource): void {
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,.25)'
  ctx.shadowBlur = w * 0.02
  if (art.logo) {
    let lw = w * 0.34
    let lh = (lw * art.logo.naturalHeight) / art.logo.naturalWidth
    if (lh > w * 0.15) {
      lw *= (w * 0.15) / lh
      lh = w * 0.15
    }
    ctx.drawImage(art.logo, (w - lw) / 2, h * 0.74 - lh / 2, lw, lh)
  } else {
    ctx.fillStyle = BLUE
    ctx.font = `700 ${w * 0.1}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(art.name, w / 2, h * 0.74)
  }
  ctx.restore()
}

/** Faixa vermelha do rodapé com filete dourado e o subtítulo. */
function drawBand(ctx: Ctx, w: number, h: number, subtitle: string): void {
  const y0 = h * 0.8
  const y1 = h * 0.93
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  g.addColorStop(0, '#e0403a')
  g.addColorStop(1, '#a61d20')
  ctx.fillStyle = g
  ctx.fillRect(0, y0, w, y1 - y0)
  ctx.fillStyle = '#f2c84b'
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
