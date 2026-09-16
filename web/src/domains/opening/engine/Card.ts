import {
  AdditiveBlending,
  Color,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  type PlaneGeometry,
  type Texture,
} from 'three'
import { withAlpha } from '../../../shared/lib/theme'
import type { PackCard } from '../../packs/model'
import { HOLO_FRAGMENT, HOLO_VERTEX, holoPreset } from './holo.glsl'
import { canvasTexture } from './textures'

export const CARD_ASPECT = 1.4
export const CARD_RADIUS = 0.05
/** `renderOrder` das camadas do §8.5: pilha 2, carta em foco 6. */
export const LAYER = { stack: 2, focus: 6 } as const

export type CardAssets = { back: Texture; badge: Texture; glow: Texture }
const FONT = "'Fredoka', system-ui, sans-serif"

export class Card {
  readonly group = new Group()
  readonly face = new Group()
  readonly badgePivot = new Group()
  readonly front: Mesh<PlaneGeometry, ShaderMaterial>
  readonly back: Mesh<PlaneGeometry, MeshBasicMaterial>
  readonly glow: Mesh<PlaneGeometry, MeshBasicMaterial>
  readonly badge: Mesh<PlaneGeometry, MeshBasicMaterial> | null
  /** Uniform compartilhado com o shader: 1 visível, 0 some (descarte). */
  readonly opacity: { value: number }
  width = 0
  height = 0

  constructor(
    geometry: PlaneGeometry,
    readonly card: PackCard,
    private readonly map: Texture,
    assets: CardAssets,
  ) {
    const preset = holoPreset(card.tier, card.reverse)
    this.opacity = { value: 1 }
    this.front = new Mesh(
      geometry,
      new ShaderMaterial({
        vertexShader: HOLO_VERTEX,
        fragmentShader: HOLO_FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: FrontSide,
        uniforms: {
          uMap: { value: map },
          uOpacity: this.opacity,
          uMask: { value: preset.mask },
          uFoil: { value: preset.foil },
          uGold: { value: preset.gold },
          uSparkle: { value: preset.sparkle },
          uEdge: { value: new Color(...preset.edge) },
          uEdgeStrength: { value: preset.edgeStrength },
          uRadius: { value: CARD_RADIUS },
        },
      }),
    )
    this.back = new Mesh(
      geometry,
      new MeshBasicMaterial({
        map: assets.back,
        transparent: true,
        depthWrite: false,
        side: FrontSide,
      }),
    )
    this.glow = new Mesh(
      geometry,
      new MeshBasicMaterial({
        map: assets.glow,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
        opacity: 0,
      }),
    )
    this.glow.visible = false
    this.glow.position.z = -0.5
    this.badge = card.new
      ? new Mesh(
          geometry,
          new MeshBasicMaterial({ map: assets.badge, transparent: true, depthWrite: false }),
        )
      : null
    this.face.rotation.y = Math.PI
    this.face.add(this.front)
    if (this.badge) {
      this.badgePivot.add(this.badge)
      this.badgePivot.scale.set(0, 0, 1)
      this.face.add(this.badgePivot)
    }
    this.group.add(this.glow, this.back, this.face)
    this.setLayer('stack')
  }

  /** Tamanho em px. O badge fica a 0.9em do canto superior esquerdo da face (em = largura/18). */
  layout(cardW: number): void {
    this.width = cardW
    this.height = cardW * CARD_ASPECT
    this.front.scale.set(this.width, this.height, 1)
    this.back.scale.set(this.width, this.height, 1)
    if (this.badge) {
      const em = cardW / 18
      this.badge.scale.set(em * 3.6, em * 1.4, 1)
      this.badgePivot.position.set(
        -this.width / 2 + em * 0.9 + em * 1.8,
        this.height / 2 - em * 0.9 - em * 0.7,
        0.5,
      )
    }
  }

  setLayer(layer: keyof typeof LAYER): void {
    const order = LAYER[layer]
    this.front.renderOrder = order
    this.back.renderOrder = order
    this.glow.renderOrder = order
    if (this.badge) this.badge.renderOrder = order
  }

  /** Verso: cor > 1 clareia (carga do suspense), < 1 escurece (os outros versos). */
  setBackTint(v: number): void {
    this.back.material.color.setScalar(v)
  }

  /** Só o que é desta carta: a textura da face e os materiais. Geometria e texturas de `assets` são compartilhadas. */
  dispose(): void {
    this.front.material.dispose()
    this.map.dispose()
    this.back.material.dispose()
    this.glow.material.dispose()
    this.badge?.material.dispose()
  }
}

/** Texturas compartilhadas por todas as cartas: verso (design do protótipo), badge "Nova", glow do suspense. */
export function createCardAssets(colors: { gold: string; rose: string }): CardAssets {
  const back = canvasTexture(512, Math.round(512 * CARD_ASPECT), (ctx, w, h) =>
    drawBack(ctx, w, h, colors.gold),
  )
  const badge = canvasTexture(256, 100, (ctx, w, h) => {
    ctx.shadowColor = withAlpha(colors.rose, 0.4)
    ctx.shadowBlur = 10
    ctx.fillStyle = colors.rose
    ctx.beginPath()
    ctx.roundRect(6, 8, w - 12, h - 16, h / 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'
    ctx.font = `700 ${h * 0.46}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Nova', w / 2, h / 2 + 1)
  })
  const glow = canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    g.addColorStop(0, withAlpha(colors.gold, 0.8))
    g.addColorStop(0.45, withAlpha(colors.rose, 0.35))
    g.addColorStop(1, withAlpha(colors.rose, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
  return { back, badge, glow }
}

function drawBack(ctx: CanvasRenderingContext2D, w: number, h: number, gold: string): void {
  const r = w * CARD_RADIUS
  const em = w / 18
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, r)
  ctx.clip()
  const g = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, w * 0.9)
  g.addColorStop(0, '#3f31ab')
  g.addColorStop(0.55, '#221b62')
  g.addColorStop(1, '#120e3a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.fillStyle = 'rgba(255,255,255,.055)'
  for (let a = 0; a < 360; a += 12) {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, w * 1.2, (a * Math.PI) / 180, ((a + 6) * Math.PI) / 180)
    ctx.closePath()
    ctx.fill()
  }
  ctx.rotate(Math.PI / 4)
  const s = w * 0.32
  const d = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.7)
  d.addColorStop(0, '#fff3c4')
  d.addColorStop(0.45, '#f6c744')
  d.addColorStop(1, '#8a5f05')
  ctx.shadowColor = 'rgba(246,199,68,.55)'
  ctx.shadowBlur = em * 1.4
  ctx.fillStyle = d
  ctx.beginPath()
  ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.18)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.lineWidth = em * 0.3
  ctx.strokeStyle = gold
  ctx.stroke()
  ctx.restore()
  ctx.lineWidth = em * 0.9
  ctx.strokeStyle = '#efeaff'
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, r)
  ctx.stroke()
  ctx.lineWidth = em * 0.12
  ctx.strokeStyle = '#b9a7ff'
  ctx.beginPath()
  ctx.roundRect(em * 0.45, em * 0.45, w - em * 0.9, h - em * 0.9, r * 0.8)
  ctx.stroke()
}
