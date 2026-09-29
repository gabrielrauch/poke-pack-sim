/**
 * Verso das cartas no estilo do TCG global: moldura azul, redemoinho azul ao fundo e Pokébola
 * inclinada ao centro. Tudo desenhado no canvas (sem arte oficial), em coordenadas relativas a `w`.
 */
export function drawCardBack(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  radius: number,
): void {
  const border = w * 0.055
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, radius)
  ctx.clip()

  const frame = ctx.createLinearGradient(0, 0, w, h)
  frame.addColorStop(0, '#3a6fd8')
  frame.addColorStop(0.5, '#1f4aa8')
  frame.addColorStop(1, '#16357f')
  ctx.fillStyle = frame
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(border, border, w - border * 2, h - border * 2, radius * 0.6)
  ctx.clip()
  const cx = w / 2
  const cy = h / 2
  const sky = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.6)
  sky.addColorStop(0, '#5b9cf0')
  sky.addColorStop(0.35, '#2a63c9')
  sky.addColorStop(0.75, '#153a93')
  sky.addColorStop(1, '#0b2163')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  drawSwirl(ctx, cx, cy, w, h)
  ctx.restore()

  ctx.lineWidth = w * 0.006
  ctx.strokeStyle = 'rgba(190,215,255,.7)'
  ctx.beginPath()
  ctx.roundRect(border, border, w - border * 2, h - border * 2, radius * 0.6)
  ctx.stroke()

  drawPokeBall(ctx, cx, cy, w * 0.3, -0.42)
}

/** Braços de espiral logarítmica feitos de manchas suaves, alternando claro e escuro. */
function drawSwirl(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
): void {
  const arms = 6
  const reach = Math.hypot(w, h) * 0.62
  for (let arm = 0; arm < arms; arm++) {
    const light = arm % 2 === 0
    const offset = (arm / arms) * Math.PI * 2
    for (let t = 0; t <= 1; t += 0.012) {
      const r = w * 0.12 + t * reach
      const theta = offset + t * Math.PI * 2.1
      const x = cx + Math.cos(theta) * r
      const y = cy + Math.sin(theta) * r
      const size = w * (0.05 + t * 0.2)
      const blob = ctx.createRadialGradient(x, y, 0, x, y, size)
      const color = light ? '150,200,255' : '6,20,72'
      const alpha = (light ? 0.16 : 0.2) * (1 - t * 0.35)
      blob.addColorStop(0, `rgba(${color},${alpha})`)
      blob.addColorStop(1, `rgba(${color},0)`)
      ctx.fillStyle = blob
      ctx.fillRect(x - size, y - size, size * 2, size * 2)
    }
  }
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.48)
  halo.addColorStop(0, 'rgba(210,235,255,.55)')
  halo.addColorStop(0.6, 'rgba(120,180,255,.18)')
  halo.addColorStop(1, 'rgba(120,180,255,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, w, h)
}

function drawPokeBall(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tilt: number,
): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(tilt)

  ctx.shadowColor = 'rgba(4,14,50,.55)'
  ctx.shadowBlur = r * 0.25
  ctx.shadowOffsetY = r * 0.06
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowColor = 'transparent'

  const inner = r * 0.94
  const top = ctx.createRadialGradient(-r * 0.35, -r * 0.55, 0, 0, 0, inner)
  top.addColorStop(0, '#ff7a6b')
  top.addColorStop(0.45, '#e3222c')
  top.addColorStop(1, '#8e0b14')
  ctx.fillStyle = top
  ctx.beginPath()
  ctx.arc(0, 0, inner, Math.PI, 0)
  ctx.closePath()
  ctx.fill()

  const bottom = ctx.createRadialGradient(-r * 0.3, r * 0.2, 0, 0, 0, inner)
  bottom.addColorStop(0, '#ffffff')
  bottom.addColorStop(0.6, '#e6e9f0')
  bottom.addColorStop(1, '#a3abbd')
  ctx.fillStyle = bottom
  ctx.beginPath()
  ctx.arc(0, 0, inner, 0, Math.PI)
  ctx.closePath()
  ctx.fill()

  const band = r * 0.17
  ctx.fillStyle = '#111'
  ctx.fillRect(-r, -band / 2, r * 2, band)

  ctx.beginPath()
  ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2)
  ctx.fill()
  const button = ctx.createRadialGradient(-r * 0.06, -r * 0.06, 0, 0, 0, r * 0.22)
  button.addColorStop(0, '#ffffff')
  button.addColorStop(1, '#cfd5e2')
  ctx.fillStyle = button
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = r * 0.025
  ctx.strokeStyle = '#9aa3b6'
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,.45)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.42, -r * 0.55, r * 0.2, r * 0.1, -0.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
