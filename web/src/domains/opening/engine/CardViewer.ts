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
import { Card, CARD_ASPECT, createCardAssets, LAYER, type CardAssets } from './Card'
import { loadCardTextures } from './textures'
import { createTilt, FOCUS_TILT_DEG, setTiltTarget, updateTilt } from './tilt'

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
    this.canvas.style.cssText = 'display:block;width:100%;height:100%'
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
    const next = new Card(this.unitPlane, card, texture!, this.assets)
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
    setTiltTarget(this.tilt, px, py)
    this.invalidate()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.raf) cancelAnimationFrame(this.raf)
    this.resizeObserver.disconnect()
    this.clear()
    this.assets.back.dispose()
    this.assets.badge.dispose()
    this.assets.glow.dispose()
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

  private readonly frame = (): void => {
    this.raf = 0
    if (this.disposed) return
    const moving = updateTilt(this.tilt)
    this.tiltGroup.rotation.x = rad(FOCUS_TILT_DEG.x * this.tilt.y)
    this.tiltGroup.rotation.y = rad(FOCUS_TILT_DEG.y * this.tilt.x)
    this.renderer.render(this.scene, this.camera)
    if (moving) this.invalidate()
  }
}
