import { Group, Mesh, MeshPhysicalMaterial, type PlaneGeometry, type Texture } from 'three'
import { MS } from '../../../shared/lib/motion'
import { bodyOutline, guidePhase, stripOutline, sweepPhase, type Outline } from './packMath'
import { canvasTexture } from './textures'
import type { Tweens } from './tween'

export const PACK_ASPECT = 1.62
export const STRIP_FRAC = 0.21
const FONT = "'Fredoka', system-ui, sans-serif"

export type PackArt = { name: string; subtitle: string; logo: HTMLImageElement | null }

/** Corpo + tira (§8.3): dois planos com MeshPhysicalMaterial (metal, clearcoat, iridescência sobre o env map). */
export class Pack {
  readonly root = new Group()
  readonly bob = new Group()
  readonly tilt = new Group()
  readonly bodyPivot = new Group()
  readonly strip = new Group()
  readonly shake = new Group()
  readonly body: Mesh<PlaneGeometry, MeshPhysicalMaterial>
  readonly stripMesh: Mesh<PlaneGeometry, MeshPhysicalMaterial>
  readonly bodyMaterial: MeshPhysicalMaterial
  readonly stripMaterial: MeshPhysicalMaterial
  width = 0
  height = 0
  stripY = 0
  private held = false
  private readonly bodyMap: Texture
  private readonly stripIntact: Texture
  private readonly stripTorn: Texture
  private readonly sweep: Texture
  private readonly guide: Texture

  constructor(geometry: PlaneGeometry, art: PackArt) {
    const stripH = Math.round(512 * PACK_ASPECT * STRIP_FRAC)
    this.bodyMap = canvasTexture(512, Math.round(512 * PACK_ASPECT), (ctx, w, h) =>
      drawBody(ctx, w, h, art),
    )
    this.stripIntact = canvasTexture(512, stripH, (ctx, w, h) => drawStrip(ctx, w, h, false))
    this.stripTorn = canvasTexture(512, stripH, (ctx, w, h) => drawStrip(ctx, w, h, true))
    this.sweep = bandTexture(0.16, 105)
    this.guide = bandTexture(0.4, 90)
    this.bodyMaterial = new MeshPhysicalMaterial({
      map: this.bodyMap,
      transparent: true,
      metalness: 0.55,
      roughness: 0.38,
      clearcoat: 0.6,
      clearcoatRoughness: 0.3,
      iridescence: 0.55,
      iridescenceIOR: 1.3,
      envMapIntensity: 0.9,
      emissive: 0xffffff,
      emissiveMap: this.sweep,
      emissiveIntensity: 0.3,
    })
    this.stripMaterial = new MeshPhysicalMaterial({
      map: this.stripIntact,
      transparent: true,
      metalness: 0.5,
      roughness: 0.4,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
      iridescence: 0.4,
      iridescenceIOR: 1.3,
      envMapIntensity: 0.9,
      emissive: 0xffffff,
      emissiveMap: this.guide,
      emissiveIntensity: 0,
    })
    this.body = new Mesh(geometry, this.bodyMaterial)
    this.body.renderOrder = 2
    this.stripMesh = new Mesh(geometry, this.stripMaterial)
    this.stripMesh.renderOrder = 2
    this.stripMesh.position.z = 2
    this.bodyPivot.add(this.body)
    this.shake.add(this.stripMesh)
    this.strip.add(this.shake)
    this.tilt.add(this.bodyPivot, this.strip)
    this.bob.add(this.tilt)
    this.root.add(this.bob)
  }

  /** Tamanho em px (1 unidade = 1 px em z=0). A tira ocupa os 21% do topo. */
  layout(packW: number): void {
    this.width = packW
    this.height = packW * PACK_ASPECT
    this.body.scale.set(this.width, this.height, 1)
    this.stripMesh.scale.set(this.width, this.height * STRIP_FRAC, 1)
    this.stripY = this.height * (0.5 - STRIP_FRAC / 2)
    this.strip.position.y = this.stripY
  }

  /** Ociosos do §8.3: bob, varredura, guia (some enquanto corta) e tremor da tira durante o corte. */
  update(now: number, tearing: boolean): void {
    this.bob.position.y = 7 * (0.5 - 0.5 * Math.cos((now / MS.bob) * Math.PI * 2))
    this.sweep.offset.x = 0.55 - 1.1 * sweepPhase(now)
    const g = guidePhase(now)
    this.guide.offset.x = 0.7 - 1.4 * g.x
    this.stripMaterial.emissiveIntensity = tearing ? 0 : g.opacity * 0.5
    this.shake.position.x = tearing ? 0.7 * Math.sin(now * 0.0628) : 0
    this.shake.position.y = tearing ? 0.5 * Math.cos(now * 0.0817) : 0
  }

  /** `scale(1.04)` ao encostar, 150 ms. */
  setHeld(held: boolean, tweens: Tweens): void {
    if (held === this.held) return
    this.held = held
    const s = held ? 1.04 : 1
    tweens.to(this.tilt.scale, { x: s, y: s, z: s }, { duration: MS.held })
  }

  /** A tira troca para a borda rasgada (§8.5, t=0). */
  tear(): void {
    this.stripMaterial.map = this.stripTorn
  }

  reset(): void {
    this.root.visible = true
    this.root.position.set(0, 0, 0)
    this.root.rotation.set(0, 0, 0)
    this.root.scale.set(1, 1, 1)
    this.tilt.scale.set(1, 1, 1)
    this.held = false
    this.bodyPivot.scale.set(1, 1, 1)
    this.bodyMaterial.opacity = 1
    this.stripMaterial.opacity = 1
    this.stripMaterial.map = this.stripIntact
    this.strip.position.set(0, this.stripY, 0)
    this.strip.rotation.set(0, 0, 0)
    this.shake.position.set(0, 0, 0)
  }

  dispose(): void {
    for (const t of [this.bodyMap, this.stripIntact, this.stripTorn, this.sweep, this.guide])
      t.dispose()
    this.bodyMaterial.dispose()
    this.stripMaterial.dispose()
  }
}

function clipOutline(ctx: CanvasRenderingContext2D, outline: Outline, w: number, h: number): void {
  ctx.beginPath()
  outline.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * w, y * h) : ctx.lineTo(x * w, y * h)))
  ctx.closePath()
  ctx.clip()
}

function stripes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  light: string,
  dark: string,
): void {
  ctx.fillStyle = dark
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = light
  for (let i = 0; i < w; i += 16) ctx.fillRect(x + i, y, 8, h)
}

/** Arte do corpo: gradiente, relevo, linhas finas, logo do set (ou nome), ridge, boca escura, bordas laterais. */
function drawBody(ctx: CanvasRenderingContext2D, w: number, h: number, art: PackArt): void {
  ctx.save()
  clipOutline(ctx, bodyOutline(), w, h)
  const g = ctx.createLinearGradient(w * 0.2, 0, w * 0.8, h)
  g.addColorStop(0, '#6a47ff')
  g.addColorStop(0.36, '#2f2196')
  g.addColorStop(0.68, '#171240')
  g.addColorStop(1, '#3d2ba6')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const relief = ctx.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.46, w * 0.62)
  relief.addColorStop(0, 'rgba(255,255,255,.16)')
  relief.addColorStop(0.62, 'rgba(255,255,255,0)')
  ctx.fillStyle = relief
  ctx.fillRect(0, 0, w, h)
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate((10 * Math.PI) / 180)
  ctx.strokeStyle = 'rgba(255,255,255,.07)'
  ctx.lineWidth = 2
  for (let x = -h; x < h; x += 10) {
    ctx.beginPath()
    ctx.moveTo(x, -h)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  ctx.restore()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,.35)'
  ctx.shadowBlur = 12
  if (art.logo) {
    const lw = w * 0.64
    const lh = (lw * art.logo.naturalHeight) / art.logo.naturalWidth
    ctx.drawImage(art.logo, (w - lw) / 2, h * 0.5 - lh / 2, lw, lh)
  } else {
    ctx.fillStyle = '#fff'
    ctx.font = `700 ${w * 0.1}px ${FONT}`
    ctx.fillText(art.name, w / 2, h * 0.5)
  }
  ctx.fillStyle = 'rgba(255,255,255,.72)'
  ctx.font = `500 ${w * 0.055}px ${FONT}`
  ctx.fillText(art.subtitle, w / 2, h * 0.7)
  ctx.shadowBlur = 0
  stripes(ctx, 0, h * 0.92, w, h * 0.05, 'rgba(255,255,255,.3)', 'rgba(0,0,0,.16)')
  const mouth = ctx.createLinearGradient(0, 0, 0, h * 0.34)
  mouth.addColorStop(0, 'rgba(5,4,20,.96)')
  mouth.addColorStop(0.52, 'rgba(5,4,20,.96)')
  mouth.addColorStop(1, 'rgba(5,4,20,0)')
  ctx.fillStyle = mouth
  ctx.fillRect(0, 0, w, h * 0.34)
  ctx.fillStyle = 'rgba(255,255,255,.2)'
  ctx.fillRect(0, 0, 2, h)
  ctx.fillStyle = 'rgba(0,0,0,.25)'
  ctx.fillRect(w - 2, 0, 2, h)
  ctx.restore()
}

function drawStrip(ctx: CanvasRenderingContext2D, w: number, h: number, torn: boolean): void {
  ctx.save()
  clipOutline(ctx, stripOutline(torn), w, h)
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#9581ff')
  g.addColorStop(0.6, '#5642d8')
  g.addColorStop(1, '#4a37c9')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  stripes(ctx, 0, h * 0.12, w, h * 0.16, 'rgba(255,255,255,.35)', 'rgba(0,0,0,.14)')
  ctx.fillStyle = 'rgba(0,0,0,.28)'
  ctx.fillRect(0, h - 4, w, 4)
  ctx.fillStyle = 'rgba(255,255,255,.2)'
  ctx.fillRect(0, 0, 2, h)
  ctx.fillStyle = 'rgba(0,0,0,.25)'
  ctx.fillRect(w - 2, 0, 2, h)
  ctx.restore()
}

/** Faixa branca suave sobre preto, girada. Com ClampToEdge, mover `offset.x` faz a faixa cruzar e sumir. */
function bandTexture(widthFrac: number, angleDeg: number): Texture {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    ctx.translate(w / 2, h / 2)
    ctx.rotate(((angleDeg - 90) * Math.PI) / 180)
    const half = (widthFrac * w) / 2
    const g = ctx.createLinearGradient(-half, 0, half, 0)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.5, 'rgba(255,255,255,1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(-w, -h, 2 * w, 2 * h)
  })
}
