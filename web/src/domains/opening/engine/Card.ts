import {
  AdditiveBlending,
  Color,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  Vector3,
  Vector4,
  type BufferGeometry,
  type Object3D,
  type PlaneGeometry,
  type Texture,
} from 'three'
import { withAlpha } from '../../../shared/lib/theme'
import type { PackCard } from '../../packs/model'
import { EDGE_FRAGMENT, EDGE_VERTEX, HOLO_FRAGMENT, HOLO_VERTEX, holoPreset } from './holo.glsl'
import { drawCardBack } from './cardBack'
import { cardEdgeGeometry } from './cardGeometry'
import { CARD_LOOK, LIGHT_DIR, type CardLook } from './look'
import { canvasTexture } from './textures'

export const CARD_ASPECT = 1.4
export const CARD_RADIUS = 0.05
/** `renderOrder` das camadas do §8.5: pilha 2, carta em foco 6. */
export const LAYER = { stack: 2, focus: 6 } as const

export type CardAssets = {
  back: Texture
  badge: Texture
  glow: Texture
  shadow: Texture
  edge: BufferGeometry
}
const FONT = "'Fredoka', system-ui, sans-serif"
/** A sombra desenhada ocupa o miolo da textura; o resto é o desfoque. Mesh = carta × isto. */
const SHADOW_PAD = 1.35
/** Atrás da carta, na "mesa" (px). */
const SHADOW_BEHIND = 24
const _pos = new Vector3()
const _ax = new Vector3()
const _ay = new Vector3()

/** Presets que a bancada pode sobrescrever ao vivo. */
export type FinishPatch = Partial<Record<'foil' | 'sparkle' | 'gold' | 'edgeStrength', number>>

export class Card {
  readonly group = new Group()
  readonly face = new Group()
  readonly badgePivot = new Group()
  readonly front: Mesh<PlaneGeometry, ShaderMaterial>
  readonly back: Mesh<PlaneGeometry, MeshBasicMaterial>
  readonly glow: Mesh<PlaneGeometry, MeshBasicMaterial>
  /** Borda (o miolo branco da carta), entre verso e face. */
  readonly edge: Mesh<BufferGeometry, ShaderMaterial>
  /** Sombra de contato: não é filha do `group`; quem monta a cena a põe no palco e chama `syncShadow`. */
  readonly shadow: Mesh<PlaneGeometry, MeshBasicMaterial>
  readonly badge: Mesh<PlaneGeometry, MeshBasicMaterial> | null
  /** Uniform compartilhado com o shader: 1 visível, 0 some (descarte). */
  readonly opacity: { value: number }
  width = 0
  height = 0
  private look: CardLook

  constructor(
    geometry: PlaneGeometry,
    readonly card: PackCard,
    private readonly map: Texture,
    assets: CardAssets,
    look: CardLook = CARD_LOOK,
  ) {
    const preset = holoPreset(card.tier, card.reverse)
    this.look = look
    this.opacity = { value: 1 }
    const light = { value: new Vector3(...LIGHT_DIR) }
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
          uArt: { value: new Vector4(...preset.art) },
          uLight: light,
          uSheen: { value: look.sheen },
          uShininess: { value: look.shininess },
          uShade: { value: look.shade },
          uRim: { value: look.rim },
        },
      }),
    )
    this.edge = new Mesh(
      assets.edge,
      new ShaderMaterial({
        vertexShader: EDGE_VERTEX,
        fragmentShader: EDGE_FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: FrontSide,
        uniforms: {
          uColor: { value: new Color(...look.edgeColor) },
          uOpacity: this.opacity,
          uLight: light,
          uSheen: { value: look.sheen },
          uShininess: { value: look.shininess },
        },
      }),
    )
    this.shadow = new Mesh(
      geometry,
      new MeshBasicMaterial({
        map: assets.shadow,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    )
    this.shadow.visible = false
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
    this.group.add(this.glow, this.edge, this.back, this.face)
    this.setLayer('stack')
  }

  /** Troca espessura, luz e cor da borda ao vivo (bancada do /lab). */
  setLook(look: CardLook): void {
    this.look = look
    const u = this.front.material.uniforms
    u.uSheen!.value = look.sheen
    u.uShininess!.value = look.shininess
    u.uShade!.value = look.shade
    u.uRim!.value = look.rim
    const e = this.edge.material.uniforms
    e.uSheen!.value = look.sheen
    e.uShininess!.value = look.shininess
    ;(e.uColor!.value as Color).setRGB(...look.edgeColor)
    if (this.width > 0) this.layout(this.width)
  }

  /** Sobrescreve números do preset holo (bancada do /lab). */
  setFinish(patch: FinishPatch): void {
    const u = this.front.material.uniforms
    if (patch.foil !== undefined) u.uFoil!.value = patch.foil
    if (patch.sparkle !== undefined) u.uSparkle!.value = patch.sparkle
    if (patch.gold !== undefined) u.uGold!.value = patch.gold
    if (patch.edgeStrength !== undefined) u.uEdgeStrength!.value = patch.edgeStrength
  }

  /**
   * Põe a sombra sob a carta como luz de cima à esquerda projetaria na mesa: segue posição, giro em z e
   * o encurtamento do flip (a largura some quando a carta está de lado). `lift` afasta, aumenta e
   * esmaece a sombra. Chamar depois de `updateMatrixWorld` e com `parent` sem escala nem rotação.
   */
  syncShadow(parent: Object3D, lift: number): void {
    const s = this.shadow
    const visible = this.look.shadowOpacity > 0 && this.opacity.value > 0 && inScene(this.group)
    s.visible = visible
    if (!visible) return
    const m = this.group.matrixWorld
    _pos.setFromMatrixPosition(m)
    parent.worldToLocal(_pos)
    _ax.setFromMatrixColumn(m, 0)
    _ay.setFromMatrixColumn(m, 1)
    const [ox, oy] = this.look.shadowOffset
    const grow = SHADOW_PAD * (1 + 0.06 * lift)
    s.position.set(_pos.x + ox * lift, _pos.y + oy * lift, _pos.z - SHADOW_BEHIND)
    s.rotation.z = Math.atan2(_ax.y, _ax.x)
    s.scale.set(
      Math.max(this.width * Math.hypot(_ax.x, _ax.y), 1) * grow,
      Math.max(this.height * Math.hypot(_ay.x, _ay.y), 1) * grow,
      1,
    )
    s.material.opacity = this.look.shadowOpacity * this.opacity.value * (1 - 0.3 * lift)
  }

  /** Tamanho em px. O badge fica a 0.9em do canto superior esquerdo da face (em = largura/18). */
  layout(cardW: number): void {
    this.width = cardW
    this.height = cardW * CARD_ASPECT
    this.front.scale.set(this.width, this.height, 1)
    this.back.scale.set(this.width, this.height, 1)
    // Verso na frente do grupo, face (girada) atrás: a espessura fica entre os dois, coberta pela borda.
    const t = Math.max(cardW * this.look.thickness, 0.01)
    this.back.position.z = t / 2
    this.face.position.z = -t / 2
    this.edge.scale.set(cardW, cardW, t)
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
    this.edge.renderOrder = order
    // Antes de tudo da camada (inclusive das cartas de trás), para nunca cobrir uma carta.
    this.shadow.renderOrder = order - 0.5
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
    this.edge.material.dispose()
    this.shadow.removeFromParent()
    this.shadow.material.dispose()
    this.badge?.material.dispose()
  }
}

/** O objeto e todos os ancestrais visíveis (a pilha fica escondida até sair do pacote). */
function inScene(obj: Object3D): boolean {
  for (let o: Object3D | null = obj; o; o = o.parent) if (!o.visible) return false
  return true
}

/** Texturas compartilhadas por todas as cartas: verso (estilo TCG global), badge "Nova", glow do suspense. */
export function createCardAssets(colors: { gold: string; rose: string }): CardAssets {
  const back = canvasTexture(512, Math.round(512 * CARD_ASPECT), (ctx, w, h) =>
    drawCardBack(ctx, w, h, w * CARD_RADIUS),
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
  const shadow = canvasTexture(128, Math.round(128 * CARD_ASPECT), (ctx, w, h) => {
    // Retângulo do tamanho da carta no miolo (1 / SHADOW_PAD), desfocado até a borda. `shadowBlur` em vez
    // de `ctx.filter` (o Safari não tem): o retângulo fica fora do canvas e só a sombra dele cai dentro.
    const cw = w / SHADOW_PAD
    const ch = h / SHADOW_PAD
    ctx.shadowColor = 'rgba(0,0,0,1)'
    ctx.shadowBlur = w * 0.1
    ctx.shadowOffsetX = w * 2
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.roundRect((w - cw) / 2 - w * 2, (h - ch) / 2, cw, ch, cw * CARD_RADIUS)
    ctx.fill()
  })
  return { back, badge, glow, shadow, edge: cardEdgeGeometry(CARD_ASPECT, CARD_RADIUS) }
}

export function disposeCardAssets(assets: CardAssets): void {
  assets.back.dispose()
  assets.badge.dispose()
  assets.glow.dispose()
  assets.shadow.dispose()
  assets.edge.dispose()
}
