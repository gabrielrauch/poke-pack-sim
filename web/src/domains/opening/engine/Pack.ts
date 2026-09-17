import { Group, Mesh, MeshPhysicalMaterial, type PlaneGeometry, type Texture } from 'three'
import { MS } from '../../../shared/lib/motion'
import { drawMouth, drawPackArt, drawSeal, type PackArtSource } from './packArt'
import { packGeometry } from './packGeometry'
import {
  bodyOutline,
  guidePhase,
  PACK_ASPECT,
  STRIP_FRAC,
  stripOutline,
  sweepPhase,
  type Outline,
} from './packMath'
import { canvasTexture } from './textures'
import type { Tween, Tweens } from './tween'

export { PACK_ASPECT, STRIP_FRAC }
export type PackArt = PackArtSource

/** Largura da textura; o pacote tem no máximo 250 px CSS × dpr 2, então 1024 dá texto nítido após o mip. */
const TEX_W = 1024
/** Segmentos na largura; a altura segue a proporção. Corpo 32×52 + tira 32×11 ≈ 3,7 k triângulos. */
const SEGMENTS = 32

/** Foil branco: metal reflete o ambiente estúdio, clearcoat dá o verniz, iridescência o arco-íris. */
const FOIL = {
  metalness: 0.45,
  roughness: 0.35,
  clearcoat: 0.5,
  clearcoatRoughness: 0.28,
  iridescence: 0.5,
  iridescenceIOR: 1.35,
  iridescenceThicknessRange: [140, 400] as [number, number],
}

/** Corpo + tira (§8.3): dois meshes estufados (`packGeometry`) com a arte de `packArt` e material foil. */
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
  private heldTween: Tween | null = null
  private readonly bodyGeometry: PlaneGeometry
  private readonly stripGeometry: PlaneGeometry
  private readonly bodyMap: Texture
  private readonly stripIntact: Texture
  private readonly stripTorn: Texture
  private readonly sweep: Texture
  private readonly guide: Texture

  constructor(art: PackArt, maxAnisotropy = 1) {
    const texH = Math.round(TEX_W * PACK_ASPECT)
    const stripH = Math.round(texH * STRIP_FRAC)
    // A frente inteira uma vez; corpo e tira são fatias dela (o logotipo fica na tira e voa com ela).
    const full = document.createElement('canvas')
    full.width = TEX_W
    full.height = texH
    const fctx = full.getContext('2d')
    if (!fctx) throw new Error('canvas 2d indisponível')
    drawPackArt(fctx, TEX_W, texH, art)
    this.bodyMap = foilTexture(TEX_W, texH, maxAnisotropy, (ctx, w, h) => {
      clipOutline(ctx, bodyOutline(), w, h)
      ctx.drawImage(full, 0, 0)
      drawSeal(ctx, w, h * 0.962, h * 0.03, h * 0.955)
      drawMouth(ctx, w, h, STRIP_FRAC)
    })
    const stripTexture = (torn: boolean) =>
      foilTexture(TEX_W, stripH, maxAnisotropy, (ctx, w, h) => {
        clipOutline(ctx, stripOutline(torn), w, h)
        ctx.drawImage(full, 0, 0, w, h, 0, 0, w, h)
        drawSeal(ctx, w, h * 0.04, h * 0.14, h * 0.2)
      })
    this.stripIntact = stripTexture(false)
    this.stripTorn = stripTexture(true)
    this.sweep = bandTexture(0.16, 105)
    this.guide = bandTexture(0.4, 90)
    this.bodyMaterial = new MeshPhysicalMaterial({
      map: this.bodyMap,
      transparent: true,
      ...FOIL,
      emissive: 0xffffff,
      emissiveMap: this.sweep,
      emissiveIntensity: 0.08,
    })
    this.stripMaterial = new MeshPhysicalMaterial({
      map: this.stripIntact,
      transparent: true,
      ...FOIL,
      emissive: 0xffffff,
      emissiveMap: this.guide,
      emissiveIntensity: 0,
    })
    this.bodyGeometry = packGeometry(SEGMENTS, Math.round(SEGMENTS * PACK_ASPECT))
    this.stripGeometry = packGeometry(
      SEGMENTS,
      Math.max(4, Math.round(SEGMENTS * PACK_ASPECT * STRIP_FRAC)),
      0,
      STRIP_FRAC,
    )
    this.body = new Mesh(this.bodyGeometry, this.bodyMaterial)
    this.body.renderOrder = 2
    this.stripMesh = new Mesh(this.stripGeometry, this.stripMaterial)
    this.stripMesh.renderOrder = 2
    this.stripMesh.position.z = 2
    this.bodyPivot.add(this.body)
    this.shake.add(this.stripMesh)
    this.strip.add(this.shake)
    this.tilt.add(this.bodyPivot, this.strip)
    this.bob.add(this.tilt)
    this.root.add(this.bob)
  }

  /** Tamanho em px (1 unidade = 1 px em z=0). z da geometria é fração da largura, daí `scale.z = w`. */
  layout(packW: number): void {
    this.width = packW
    this.height = packW * PACK_ASPECT
    this.body.scale.set(this.width, this.height, this.width)
    this.stripMesh.scale.set(this.width, this.height * STRIP_FRAC, this.width)
    this.stripY = this.height * (0.5 - STRIP_FRAC / 2)
    this.strip.position.y = this.stripY
  }

  /** Ociosos do §8.3 (bob, varredura, guia) só com `idle`; o tremor da tira durante o corte é feedback e fica sempre. */
  update(now: number, tearing: boolean, idle = true): void {
    if (idle) {
      this.bob.position.y = 7 * (0.5 - 0.5 * Math.cos((now / MS.bob) * Math.PI * 2))
      this.sweep.offset.x = 0.55 - 1.1 * sweepPhase(now)
      const g = guidePhase(now)
      this.guide.offset.x = 0.7 - 1.4 * g.x
      this.stripMaterial.emissiveIntensity = tearing ? 0 : g.opacity * 0.25
    } else {
      this.bob.position.y = 0
      this.sweep.offset.x = 0.55
      this.stripMaterial.emissiveIntensity = 0
    }
    this.shake.position.x = tearing ? 0.7 * Math.sin(now * 0.0628) : 0
    this.shake.position.y = tearing ? 0.5 * Math.cos(now * 0.0817) : 0
  }

  /** `scale(1.04)` ao encostar, 150 ms. */
  setHeld(held: boolean, tweens: Tweens): void {
    if (held === this.held) return
    this.held = held
    const s = held ? 1.04 : 1
    this.heldTween?.cancel()
    this.heldTween = tweens.to(this.tilt.scale, { x: s, y: s, z: s }, { duration: MS.held })
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
    this.bodyGeometry.dispose()
    this.stripGeometry.dispose()
  }
}

function foilTexture(
  w: number,
  h: number,
  maxAnisotropy: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): Texture {
  const tex = canvasTexture(w, h, draw)
  tex.anisotropy = Math.min(4, maxAnisotropy)
  return tex
}

function clipOutline(ctx: CanvasRenderingContext2D, outline: Outline, w: number, h: number): void {
  ctx.beginPath()
  outline.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * w, y * h) : ctx.lineTo(x * w, y * h)))
  ctx.closePath()
  ctx.clip()
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
