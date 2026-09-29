import {
  DoubleSide,
  Group,
  NoToneMapping,
  NormalBlending,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three'
import type { ThemeColors } from '../../../shared/lib/theme'
import { cardImage, isHit } from '../../catalog/model'
import type { PackCard } from '../../packs/model'
import {
  Card,
  CARD_ASPECT,
  createCardAssets,
  disposeCardAssets,
  LAYER,
  type CardAssets,
  type FinishPatch,
} from './Card'
import { CARD_LOOK, SHADOW_LIFT, type CardLook } from './look'
import { loadCardTextures } from './textures'
import { createTilt, setTiltTarget, updateTilt } from './tilt'

/** Mesma perspectiva da abertura: 1 unidade = 1 px CSS em z=0. */
const CAMERA_Z = 1000
/** A carta ocupa esta fração da altura do canvas; o resto é folga para o giro e o brilho. */
const CARD_FILL = 0.88
/** Brilho de hit parado atrás da carta (na abertura ele só aparece na carga do suspense). */
const GLOW_OPACITY = 0.8
/** O brilho enche o canvas (o gradiente zera na borda); um pouco menos para o giro não cortá-lo. */
const GLOW_FILL = 0.96
/** Entrada: o olhar começa inclinado e volta ao centro, e o foil varre a carta uma vez. */
const INTRO_TILT: [number, number] = [-0.9, 0.5]
/** Giro automático da bancada: uma volta em oval a cada tantos ms. */
const SPIN_MS = 5200
/**
 * A sombra e o brilho passam da borda do canvas; sem isto apareceria um corte reto na folha clara.
 * A carta ocupa os 88% do meio, então esmaecer os 4% de cada lado não toca nela.
 */
const EDGE_FADE = (() => {
  const x = 'linear-gradient(to right, transparent, #000 4%, #000 96%, transparent)'
  const y = 'linear-gradient(to bottom, transparent, #000 4%, #000 96%, transparent)'
  return `-webkit-mask-image:${x},${y};-webkit-mask-composite:source-in;mask-image:${x},${y};mask-composite:intersect`
})()
const rad = (deg: number) => (deg * Math.PI) / 180

/**
 * Uma carta sozinha, em canvas transparente, com o shader holo e o tilt da carta em foco da abertura.
 * O loop só roda enquanto o tilt se move.
 */
export class CardViewer {
  private readonly canvas: HTMLCanvasElement
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(40, 1, 100, 3000)
  private readonly tiltGroup = new Group()
  private readonly unitPlane = new PlaneGeometry(1, 1)
  private readonly assets: CardAssets
  private readonly tilt = createTilt()
  private readonly resizeObserver: ResizeObserver
  private card: Card | null = null
  private look: CardLook = CARD_LOOK
  private finish: FinishPatch = {}
  private spinning = false
  private lastFrame = -1
  private generation = 0
  private raf = 0
  private disposed = false
  private w = 0
  private h = 0

  constructor(
    private readonly container: HTMLElement,
    colors: ThemeColors,
    private readonly options: { reducedMotion?: boolean } = {},
  ) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.cssText = `display:block;width:100%;height:100%;${EDGE_FADE}`
    container.appendChild(this.canvas)
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      stencil: false,
    })
    this.renderer.toneMapping = NoToneMapping
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.camera.position.z = CAMERA_Z
    this.assets = createCardAssets(colors)
    this.scene.add(this.tiltGroup)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
  }

  /** Troca a carta; resolve quando a face carregou (ou virou placeholder). */
  async show(card: PackCard): Promise<void> {
    const gen = ++this.generation
    const [texture] = await loadCardTextures(
      [cardImage(card.img, 'high')],
      [card.name],
      this.renderer.capabilities.getMaxAnisotropy(),
    )
    if (gen !== this.generation || this.disposed) {
      texture?.dispose()
      return
    }
    this.clear()
    const next = new Card(this.unitPlane, card, texture!, this.assets, this.look)
    next.setFinish(this.finish)
    this.scene.add(next.shadow)
    next.setLayer('focus')
    // O grupo nasce de costas (verso para a câmera); meia volta mostra a face, como no fim do flip.
    next.group.rotation.y = Math.PI
    if (isHit(card.tier)) {
      // Normal em vez de aditivo: no canvas transparente sobre a folha clara o aditivo some. Com o grupo
      // de face, o brilho precisa de dupla face, ficar atrás (z espelhado) e ser desenhado antes da carta.
      next.glow.material.blending = NormalBlending
      next.glow.material.side = DoubleSide
      next.glow.position.z = -next.glow.position.z
      next.glow.renderOrder = LAYER.focus - 1
      next.glow.material.opacity = GLOW_OPACITY
      next.glow.visible = true
    }
    this.card = next
    this.tiltGroup.add(next.group)
    this.layout()
    if (!this.options.reducedMotion) {
      this.tilt.x = INTRO_TILT[0]
      this.tilt.y = INTRO_TILT[1]
    }
    this.invalidate()
  }

  setTiltTarget(px: number, py: number): void {
    if (this.spinning) return
    setTiltTarget(this.tilt, px, py)
    this.invalidate()
  }

  /** Bancada: corpo e luz ao vivo (vale também para a próxima carta). */
  setLook(look: CardLook): void {
    this.look = look
    this.card?.setLook(look)
    this.invalidate()
  }

  /** Bancada: números do preset holo por cima do tier. `{}` volta ao preset. */
  setFinish(patch: FinishPatch): void {
    this.finish = patch
    this.card?.setFinish(patch)
    this.invalidate()
  }

  /** Bancada: a carta gira sozinha em oval (para ver o foil sem mexer o mouse ou o celular). */
  setSpin(on: boolean): void {
    this.spinning = on
    if (!on) setTiltTarget(this.tilt, 0, 0)
    this.invalidate()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.raf) cancelAnimationFrame(this.raf)
    this.resizeObserver.disconnect()
    this.clear()
    disposeCardAssets(this.assets)
    this.unitPlane.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.canvas.remove()
  }

  private clear(): void {
    if (!this.card) return
    this.tiltGroup.remove(this.card.group)
    this.card.dispose()
    this.card = null
  }

  private resize(): void {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (w === 0 || h === 0) return
    this.w = w
    this.h = h
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.fov = (2 * Math.atan(h / 2 / CAMERA_Z) * 180) / Math.PI
    this.camera.updateProjectionMatrix()
    this.layout()
    this.invalidate()
  }

  private layout(): void {
    if (!this.card || this.w === 0) return
    const cardW = Math.min(this.w * CARD_FILL, (this.h * CARD_FILL) / CARD_ASPECT)
    this.card.layout(cardW)
    this.card.glow.scale.set(this.w * GLOW_FILL, this.h * GLOW_FILL, 1)
  }

  private invalidate(): void {
    if (this.raf || this.disposed) return
    this.raf = requestAnimationFrame(this.frame)
  }

  private readonly frame = (now: number): void => {
    this.raf = 0
    if (this.disposed) return
    const dt = this.lastFrame >= 0 ? now - this.lastFrame : 1000 / 60
    if (this.spinning) {
      const a = (now / SPIN_MS) * Math.PI * 2
      setTiltTarget(this.tilt, Math.cos(a), Math.sin(a) * 0.7)
    }
    const moving = updateTilt(this.tilt, dt, this.look.spring) || this.spinning
    this.tiltGroup.rotation.x = rad(this.look.tiltDeg.x * this.tilt.y)
    this.tiltGroup.rotation.y = rad(this.look.tiltDeg.y * this.tilt.x)
    if (this.card) {
      this.scene.updateMatrixWorld()
      this.card.syncShadow(this.scene, SHADOW_LIFT.focus)
    }
    this.renderer.render(this.scene, this.camera)
    this.lastFrame = moving ? now : -1
    if (moving) this.invalidate()
  }
}
