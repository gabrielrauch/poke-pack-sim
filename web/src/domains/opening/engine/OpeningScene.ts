import {
  Group,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  Vector3,
  WebGLRenderer,
  type Texture,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EASE, MS } from '../../../shared/lib/motion'
import { cardImage, type PackArt } from '../../catalog/model'
import type { PackCard } from '../../packs/model'

export type { PackArt }
import { Burst } from './Burst'
import { Card, createCardAssets, type CardAssets } from './Card'
import { Pack, PACK_ASPECT } from './Pack'
import {
  BADGE_POP,
  CHARGE,
  CHARGE_SHAKE,
  DIM,
  DISCARD,
  FALL,
  FLIP_FACE_AT,
  flipFrames,
  NUDGE,
  OPENING,
  PACK_ENTER,
  RECOIL,
  revealPlan,
  STACK,
  stackPose,
  STRIP_JUMP,
  transition,
  type Event,
  type Reveal,
  type State,
} from './sequence'
import { tearBegin, tearMove, tearRelease, type Tear } from './tear'
import { TearLine } from './TearLine'
import { canvasTexture, loadCardTextures, loadImage } from './textures'
import { createTilt, setTiltTarget, updateTilt } from './tilt'
import { Tweens } from './tween'

export type SceneColors = { bg: string; bg2: string; gold: string; rose: string; violet: string }
export type SceneCallbacks = {
  onState?: (state: State) => void
  /** A face da carta `index` está visível (flip terminou). */
  onReveal?: (index: number) => void
  /** A carta `index` foi descartada (vai para a bandeja). */
  onDismiss?: (index: number) => void
  onFinish?: () => void
  onNudge?: () => void
  vibrate?: (pattern: number | number[]) => void
}
export type SceneStats = {
  fps: number
  frameMs: number
  calls: number
  triangles: number
  dpr: number
}
export type Rect = { left: number; top: number; width: number; height: number }

/** 1 unidade = 1 px CSS em z=0; mesma perspectiva do protótipo (`perspective: 1000px`). */
const CAMERA_Z = 1000
/** Metade dos 64 px reservados para a bandeja: o centro da cena sobe. */
const STAGE_Y = 32
const FRAME_WINDOW = 30
const FRAME_BUDGET_MS = 20
/** Frames ignorados pelo degrau de dpr: compilação de shaders e upload de texturas no começo. */
const FRAME_WARMUP = 90
const rad = (deg: number) => (deg * Math.PI) / 180

export class OpeningScene {
  state: State = 'summary'
  private readonly canvas: HTMLCanvasElement
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera: PerspectiveCamera
  private readonly stage = new Group()
  private readonly stack = new Group()
  private readonly focus = new Group()
  private readonly dim: Mesh<PlaneGeometry, MeshBasicMaterial>
  private readonly unitPlane = new PlaneGeometry(1, 1)
  private readonly tweens = new Tweens()
  private readonly tilt = createTilt()
  private readonly burst: Burst
  private readonly tearLine: TearLine
  private readonly cardAssets: CardAssets
  private readonly background: Texture
  private pack: Pack | null = null
  private packName = ''
  private cards: Card[] = []
  private plan: Reveal[] = []
  private revealed = 0
  private tear: Tear | null = null
  private generation = 0
  /** `present()` em andamento; `load()` espera por ele antes de montar a pilha. */
  private presenting: Promise<void> = Promise.resolve()
  /** Cartas carregadas e pilha montada. */
  private ready = false
  /** O corte terminou antes das cartas chegarem: `load()` dispara a abertura com esta direção. */
  private pendingOpen: -1 | 1 | null = null
  private disposed = false
  private w = 0
  private h = 0
  private cardW = 0
  private cardH = 0
  private packW = 0
  private raf = 0
  private running = false
  private now = 0
  private lastFrame = -1
  private readonly frameTimes = new Float32Array(FRAME_WINDOW)
  private frameIndex = 0
  private frameCount = 0
  private readonly dprSteps: number[]
  private dprIndex = 0
  private lastCalls = 0
  private lastTriangles = 0
  private readonly corners = [new Vector3(), new Vector3(), new Vector3(), new Vector3()]
  private readonly resizeObserver: ResizeObserver
  private readonly onVisibility = (): void => {
    if (document.hidden) this.stop()
    else this.invalidate()
  }

  constructor(
    private readonly container: HTMLElement,
    colors: SceneColors,
    private readonly callbacks: SceneCallbacks,
  ) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.cssText = 'display:block;width:100%;height:100%'
    container.appendChild(this.canvas)
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    })
    this.renderer.toneMapping = NoToneMapping
    this.renderer.shadowMap.enabled = false
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.dprSteps = [dpr, 1.5, 1].filter((s, i, arr) => i === 0 || s < arr[0]!)
    this.renderer.setPixelRatio(dpr)

    this.camera = new PerspectiveCamera(40, 1, 100, 3000)
    this.camera.position.z = CAMERA_Z

    this.background = canvasTexture(256, 256, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.18, 0, w * 0.5, h * 0.18, w * 1.05)
      g.addColorStop(0, colors.bg2)
      g.addColorStop(0.7, colors.bg)
      g.addColorStop(1, colors.bg)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    })
    this.scene.background = this.background

    const pmrem = new PMREMGenerator(this.renderer)
    const room = new RoomEnvironment()
    this.scene.environment = pmrem.fromScene(room, 0.04).texture
    room.dispose()
    // O RoomEnvironment é uma sala branca: em 1.0 o pacote roxo vira lilás. Só o pacote usa o env map.
    this.scene.environmentIntensity = 0.4
    pmrem.dispose()

    this.dim = new Mesh(
      this.unitPlane,
      new MeshBasicMaterial({
        color: 0x08061c,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
      }),
    )
    this.dim.position.z = -300
    this.dim.renderOrder = 1
    this.dim.visible = false

    this.cardAssets = createCardAssets(colors)
    this.burst = new Burst(this.unitPlane, colors)
    this.burst.setPixelRatio(dpr)
    this.tearLine = new TearLine(this.unitPlane, colors.rose)
    this.stage.position.y = STAGE_Y
    this.stack.position.z = -10
    this.stage.add(this.dim, this.burst.group, this.stack, this.focus)
    this.scene.add(this.stage)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.resize()
  }

  /**
   * Zera a cena e mostra o pacote fechado com a entrada do §8.10. As cartas chegam depois por
   * `load()`: o pacote já está na tela enquanto o `POST /api/packs` roda (§1.3, a animação cobre a latência).
   */
  present(art: PackArt): Promise<void> {
    const gen = ++this.generation
    this.tweens.cancelAll()
    this.clearCards()
    this.revealed = 0
    this.ready = false
    this.pendingOpen = null
    this.tear = null
    this.burst.reset()
    this.tearLine.reset()
    this.dim.visible = false
    this.dim.material.opacity = 0
    this.focus.rotation.set(0, 0, 0)
    this.stack.visible = false
    this.presenting = this.buildPack(art, gen).then(() => {
      if (gen !== this.generation || this.disposed || !this.pack) return
      const pack = this.pack
      pack.reset()
      this.renderer.compile(this.scene, this.camera)
      this.setState('pack')
      const root = pack.root
      root.position.y = PACK_ENTER.y
      root.scale.setScalar(PACK_ENTER.scale)
      pack.bodyMaterial.opacity = 0
      pack.stripMaterial.opacity = 0
      const enter = { duration: MS.packEnter, easing: EASE.settle }
      this.tweens.to(root.position, { y: 0 }, enter)
      this.tweens.to(root.scale, { x: 1, y: 1, z: 1 }, enter)
      this.tweens.to(pack.bodyMaterial, { opacity: 1 }, enter)
      this.tweens.to(pack.stripMaterial, { opacity: 1 }, enter)
      this.invalidate()
    })
    return this.presenting
  }

  /** Reaproveita o pacote se a arte é a mesma; senão desenha um novo (fonte e logo carregam antes). */
  private async buildPack(art: PackArt, gen: number): Promise<void> {
    if (this.pack && this.packName === art.name) return
    await document.fonts.load("700 40px 'Fredoka'").catch(() => [])
    const logo = await loadImage(art.logo)
    if (gen !== this.generation || this.disposed) return
    if (this.pack) {
      this.stage.remove(this.pack.root)
      this.pack.dispose()
    }
    this.pack = new Pack(this.unitPlane, { name: art.name, subtitle: art.subtitle, logo })
    this.packName = art.name
    this.pack.tilt.add(this.tearLine.group)
    this.stage.add(this.pack.root)
    this.pack.layout(this.packW)
  }

  /**
   * Carrega as 5 texturas e monta a pilha atrás do pacote apresentado. Se o corte terminou antes
   * de as cartas chegarem (`pendingOpen`), a abertura do §8.5 começa aqui.
   */
  async load(pack: PackCard[]): Promise<void> {
    const gen = this.generation
    await this.presenting
    if (gen !== this.generation || this.disposed || !this.pack) return
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy()
    const textures = await loadCardTextures(
      pack.map((c) => cardImage(c.img, 'high')),
      pack.map((c) => c.name),
      maxAnisotropy,
    )
    if (gen !== this.generation || this.disposed) {
      for (const t of textures) t.dispose()
      return
    }
    this.clearCards()
    this.cards = pack.map((c, i) => {
      const card = new Card(this.unitPlane, c, textures[i]!, this.cardAssets)
      card.layout(this.cardW)
      const pose = stackPose(i)
      card.group.position.set(0, pose.y, -i)
      card.group.rotation.z = rad(pose.rz)
      this.stack.add(card.group)
      return card
    })
    this.plan = revealPlan(pack)
    this.stack.position.y = 0
    this.stack.scale.setScalar(STACK.hiddenScale)
    for (const t of textures) this.renderer.initTexture(t)
    // Compila com a pilha visível e esconde de novo até subir pela boca (§8.5, t=140).
    this.stack.visible = true
    this.renderer.compile(this.scene, this.camera)
    this.stack.visible = false
    this.ready = true
    if (this.pendingOpen !== null) {
      const dir = this.pendingOpen
      this.pendingOpen = null
      this.playOpening(dir)
    }
    this.invalidate()
  }

  /** Retângulo projetado do corpo do pacote, em px CSS relativos ao container (para o gesto). */
  packRect(): Rect | null {
    const pack = this.pack
    if (!pack || !pack.root.visible || this.w === 0) return null
    pack.body.updateWorldMatrix(true, false)
    this.camera.updateMatrixWorld()
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (let i = 0; i < 4; i++) {
      const v = this.corners[i]!.set(i % 2 ? 0.5 : -0.5, i < 2 ? 0.5 : -0.5, 0)
      pack.body.localToWorld(v)
      v.project(this.camera)
      const x = ((v.x + 1) / 2) * this.w
      const y = ((1 - v.y) / 2) * this.h
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    return { left: minX, top: minY, width: maxX - minX, height: maxY - minY }
  }

  setTiltTarget(px: number, py: number): void {
    setTiltTarget(this.tilt, px, py)
    this.invalidate()
  }

  setHeld(held: boolean): void {
    this.pack?.setHeld(held, this.tweens)
    this.invalidate()
  }

  /** Toque fora da tira: o pacote balança e o hint pisca (callback). */
  nudge(): void {
    if (this.state !== 'pack' || !this.pack) return
    this.tweens.keyframes(
      this.pack.root.rotation,
      NUDGE.map((k) => ({ at: k.at, to: { z: rad(k.rz) } })),
      { duration: MS.nudge },
    )
    this.callbacks.onNudge?.()
    this.invalidate()
  }

  tearStart(xFrac: number): void {
    if (!this.pack || !this.dispatch('tearStart')) return
    this.tear = tearBegin(xFrac)
    this.tearLine.show(this.tear.a, this.tear.b, 0)
    this.pack.setHeld(true, this.tweens)
    this.invalidate()
  }

  /** `dx` em px desde o toque; `width` é a largura projetada do pacote em px. */
  tearMove(xFrac: number, dx: number, width: number): void {
    if (this.state !== 'tearing' || !this.tear) return
    const r = tearMove(this.tear, xFrac, dx, width)
    this.tear = r.tear
    this.tearLine.show(r.tear.a, r.tear.b, r.tear.dir)
    if (r.milestone) {
      this.callbacks.vibrate?.(5)
      this.tearLine.spawnFlecks(r.tear.dir < 0 ? r.tear.a : r.tear.b, 2, false)
    }
    if (r.complete) this.completeTear()
    this.invalidate()
  }

  tearEnd(): void {
    if (this.state !== 'tearing' || !this.tear) return
    if (tearRelease(this.tear) === 'complete') this.completeTear()
    else this.tearCancel()
  }

  tearCancel(): void {
    if (!this.dispatch('tearCancel')) return
    this.tear = null
    this.tearLine.hide(this.tweens)
    this.pack?.setHeld(false, this.tweens)
    this.invalidate()
  }

  /** Completa o corte: soltar com p ≥ 0,7, arrastar até 0,98, ou teclado (espaço/Enter/seta para cima). */
  completeTear(): void {
    const dir: -1 | 1 = this.tear?.dir === -1 ? -1 : 1
    if (!this.pack || !this.dispatch('tearComplete')) return
    this.tear = null
    this.pack.setHeld(false, this.tweens)
    this.tearLine.setDone(this.tweens)
    if (this.ready) this.playOpening(dir)
    else this.pendingOpen = dir // as cartas ainda não chegaram: a abertura começa no fim de load()
    this.invalidate()
  }

  /** Um swipe/toque = uma carta (§8.6). */
  next(): void {
    const card = this.cards[this.revealed]
    if (!card || !this.dispatch('next')) return
    const index = this.revealed
    this.revealed++
    this.burst.raysOff(this.tweens)
    this.callbacks.onDismiss?.(index)
    const opts = { duration: MS.discard, easing: EASE.discard }
    this.tweens.to(card.group.position, { y: DISCARD.y * card.height }, opts)
    this.tweens.to(card.group.scale, { x: DISCARD.scale, y: DISCARD.scale }, opts)
    this.tweens.to(
      card.opacity,
      { value: 0 },
      {
        ...opts,
        onComplete: () => {
          card.group.visible = false
          this.revealNext()
        },
      },
    )
    this.invalidate()
  }

  stats(): SceneStats {
    const n = Math.min(this.frameCount, FRAME_WINDOW)
    let sum = 0
    for (let i = 0; i < n; i++) sum += this.frameTimes[i]!
    const avg = n > 0 ? sum / n : 0
    return {
      fps: avg > 0 ? 1000 / avg : 0,
      frameMs: avg,
      calls: this.lastCalls,
      triangles: this.lastTriangles,
      dpr: this.renderer.getPixelRatio(),
    }
  }

  /** Liga o loop; ele se desliga sozinho quando não há tween, tilt em movimento nem animação ociosa. */
  invalidate(): void {
    if (this.running || this.disposed || document.hidden) return
    this.running = true
    this.raf = requestAnimationFrame(this.frame)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.generation++
    this.stop()
    this.resizeObserver.disconnect()
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.tweens.cancelAll()
    this.clearCards()
    this.pack?.dispose()
    this.tearLine.dispose()
    this.burst.dispose()
    this.dim.material.dispose()
    this.cardAssets.back.dispose()
    this.cardAssets.badge.dispose()
    this.cardAssets.glow.dispose()
    this.background.dispose()
    this.scene.environment?.dispose()
    this.unitPlane.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.canvas.remove()
  }

  /* ---------- linha do tempo do §8.5 ---------- */

  private playOpening(dir: -1 | 1): void {
    const pack = this.pack!
    const tw = this.tweens
    const packH = pack.height
    this.callbacks.vibrate?.([16, 30, 28])
    this.tearLine.playFlash(tw)
    this.tearLine.spawnFlecks(0.5, 26, true)
    tw.keyframes(
      pack.bodyPivot.scale,
      RECOIL.map((k) => ({ at: k.at, to: { x: k.s, y: k.s } })),
      { duration: OPENING.recoil.duration },
    )
    pack.tear()
    const sy = pack.stripY
    const strip = { duration: OPENING.strip.duration, easing: OPENING.strip.easing }
    tw.keyframes(
      pack.strip.position,
      [
        { at: 0, to: { x: 0, y: sy } },
        { at: 0.22, to: { x: 0, y: sy + STRIP_JUMP.lift } },
        { at: 1, to: { x: STRIP_JUMP.drift * dir, y: sy + STRIP_JUMP.rise } },
      ],
      strip,
    )
    tw.keyframes(
      pack.strip.rotation,
      [
        { at: 0, to: { z: 0 } },
        { at: 0.22, to: { z: rad(STRIP_JUMP.tilt * dir) } },
        { at: 1, to: { z: rad(STRIP_JUMP.spin * dir) } },
      ],
      strip,
    )
    tw.keyframes(
      pack.stripMaterial,
      [
        { at: 0, to: { opacity: 1 } },
        { at: 0.22, to: { opacity: 1 } },
        { at: 1, to: { opacity: 0 } },
      ],
      strip,
    )
    tw.after(OPENING.cutOff.at, () => this.tearLine.hide(tw))
    tw.after(OPENING.rise.at, () => {
      this.stack.visible = true
      const s = STACK.riseScale
      const rise = { duration: OPENING.rise.duration, easing: OPENING.rise.easing }
      tw.to(this.stack.position, { y: STACK.riseY * this.cardH }, rise)
      tw.to(this.stack.scale, { x: s, y: s, z: s }, rise)
    })
    tw.after(OPENING.fall.at, () => {
      const fall = { duration: OPENING.fall.duration, easing: OPENING.fall.easing }
      tw.to(pack.root.position, { y: -FALL.y * packH }, fall)
      tw.to(pack.root.rotation, { z: rad(FALL.rotate) }, fall)
      tw.to(pack.bodyMaterial, { opacity: 0 }, fall)
    })
    tw.after(OPENING.settle.at, () => {
      const settle = { duration: OPENING.settle.duration, easing: OPENING.settle.easing }
      tw.to(this.stack.position, { y: 0 }, settle)
      tw.to(this.stack.scale, { x: 1, y: 1, z: 1 }, settle)
    })
    tw.after(OPENING.packGone.at, () => {
      pack.root.visible = false
      this.dispatch('opened')
      this.revealNext()
    })
    this.invalidate()
  }

  /* ---------- revelação (§8.6–8.8) ---------- */

  private revealNext(): void {
    const card = this.cards[this.revealed]
    const plan = this.plan[this.revealed]
    if (!card || !plan) {
      this.finish()
      return
    }
    if (plan.suspense) this.suspense(card, plan.index, () => this.flip(card, plan))
    else this.flip(card, plan)
  }

  /** §8.7: véu escuro, outros versos a 55%, o do topo carrega por 1,4 s; o flip vem 1450 ms depois. */
  private suspense(card: Card, index: number, then: () => void): void {
    const tw = this.tweens
    this.dim.visible = true
    tw.to(this.dim.material, { opacity: DIM.opacity }, { duration: MS.dim })
    for (let k = index + 1; k < this.cards.length; k++) {
      tw.to(
        this.cards[k]!.back.material.color,
        { r: DIM.others, g: DIM.others, b: DIM.others },
        { duration: MS.dim },
      )
    }
    const glow = card.glow
    const charge = { duration: MS.charge, easing: EASE.easeIn }
    glow.visible = true
    glow.scale.set(card.width * CHARGE.glowFrom, card.width * CHARGE.glowFrom, 1)
    tw.to(glow.scale, { x: card.width * CHARGE.glowTo, y: card.width * CHARGE.glowTo }, charge)
    tw.to(glow.material, { opacity: CHARGE.glowOpacity }, charge)
    tw.to(
      card.back.material.color,
      { r: CHARGE.backBoost, g: CHARGE.backBoost, b: CHARGE.backBoost },
      charge,
    )
    tw.keyframes(
      card.group.position,
      CHARGE_SHAKE.map((k) => ({ at: k.at, to: { x: k.x } })),
      charge,
    )
    tw.to(card.group.scale, { x: CHARGE.scale, y: CHARGE.scale }, charge)
    this.callbacks.vibrate?.([10, 70, 10, 70, 10, 70, 40])
    tw.after(MS.suspense, () => {
      tw.to(
        glow.material,
        { opacity: 0 },
        {
          duration: 200,
          onComplete: () => {
            glow.visible = false
          },
        },
      )
      then()
    })
    this.invalidate()
  }

  private flip(card: Card, plan: Reveal): void {
    const tw = this.tweens
    this.focus.add(card.group)
    card.setLayer('focus')
    card.group.position.set(0, 0, 0)
    card.group.rotation.set(0, 0, 0)
    card.group.scale.set(1, 1, 1)
    card.setBackTint(1)
    const frames = flipFrames()
    const ms = plan.flipMs
    tw.keyframes(card.group.position, frames.position, { duration: ms, easing: EASE.flip })
    tw.keyframes(card.group.rotation, frames.rotation, { duration: ms, easing: EASE.flip })
    tw.keyframes(card.group.scale, frames.scale, {
      duration: ms,
      easing: EASE.flip,
      onComplete: () => {
        this.undim()
        this.dispatch('revealed')
        this.callbacks.onReveal?.(plan.index)
      },
    })
    tw.after(ms * FLIP_FACE_AT, () => {
      if (plan.hit) {
        this.burst.fire(card.card.tier, this.now, tw)
        this.callbacks.vibrate?.([20, 40, 70])
      } else if (plan.buzz) {
        this.callbacks.vibrate?.(8)
      }
    })
    if (card.badge) {
      card.badgePivot.scale.set(0, 0, 1)
      card.badgePivot.rotation.z = rad(BADGE_POP.rz)
      const pop = { duration: MS.badge, easing: EASE.badge, delay: MS.badgeDelay }
      tw.to(card.badgePivot.scale, { x: 1, y: 1 }, pop)
      tw.to(card.badgePivot.rotation, { z: 0 }, pop)
    }
    this.invalidate()
  }

  private undim(): void {
    if (!this.dim.visible) return
    this.tweens.to(
      this.dim.material,
      { opacity: 0 },
      {
        duration: MS.dim,
        onComplete: () => {
          this.dim.visible = false
        },
      },
    )
    for (const c of this.cards) {
      if (c.group.parent === this.stack) {
        this.tweens.to(c.back.material.color, { r: 1, g: 1, b: 1 }, { duration: MS.dim })
      }
    }
  }

  private finish(): void {
    if (this.dispatch('finished')) this.callbacks.onFinish?.()
  }

  /* ---------- infraestrutura ---------- */

  private dispatch(event: Event): boolean {
    const next = transition(this.state, event)
    if (!next) return false
    this.setState(next)
    return true
  }

  private setState(state: State): void {
    this.state = state
    this.callbacks.onState?.(state)
  }

  private clearCards(): void {
    for (const c of this.cards) {
      c.group.removeFromParent()
      c.dispose()
    }
    this.cards = []
    this.plan = []
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
    this.cardW = Math.min(0.72 * w, 300, 0.52 * h)
    this.cardH = this.cardW * 1.4
    this.packW = Math.min(0.62 * w, 250, 0.4 * h)
    this.pack?.layout(this.packW)
    this.tearLine.layout(this.packW, this.packW * PACK_ASPECT)
    for (const c of this.cards) c.layout(this.cardW)
    this.burst.layout(w, h, this.cardW)
    this.dim.scale.set(w * 1.4, h * 1.4, 1)
    this.invalidate()
  }

  private applyTilt(): void {
    const t = this.tilt
    if (this.pack) {
      this.pack.tilt.rotation.x = rad(7 * t.y)
      this.pack.tilt.rotation.y = rad(9 * t.x)
    }
    this.focus.rotation.x = rad(11 * t.y)
    this.focus.rotation.y = rad(13 * t.x)
  }

  private readonly frame = (now: number): void => {
    this.raf = 0
    if (this.disposed) return
    const dt = this.lastFrame >= 0 ? Math.min(now - this.lastFrame, 100) : 16
    if (this.lastFrame >= 0) {
      this.frameTimes[this.frameIndex] = now - this.lastFrame
      this.frameIndex = (this.frameIndex + 1) % FRAME_WINDOW
      this.frameCount++
      if (this.frameCount % FRAME_WINDOW === 0) this.checkBudget()
    }
    this.lastFrame = now
    this.now = now
    this.tweens.update(now)
    const tilting = updateTilt(this.tilt)
    this.applyTilt()
    let idle = false
    if (this.pack?.root.visible) {
      this.pack.update(now, this.state === 'tearing')
      idle = true
    }
    if (this.tearLine.update(dt)) idle = true
    if (this.burst.update(now)) idle = true
    this.renderer.render(this.scene, this.camera)
    this.lastCalls = this.renderer.info.render.calls
    this.lastTriangles = this.renderer.info.render.triangles
    if (this.tweens.active > 0 || tilting || idle) {
      this.raf = requestAnimationFrame(this.frame)
    } else {
      this.running = false
      this.lastFrame = -1
    }
  }

  private stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this.running = false
    this.lastFrame = -1
  }

  /** Mais da metade de 30 frames acima de 20 ms: cai um degrau de pixel ratio (2 → 1,5 → 1), nunca sobe. */
  private checkBudget(): void {
    if (this.frameCount < FRAME_WARMUP || this.dprIndex >= this.dprSteps.length - 1) return
    // Maioria dos frames acima do orçamento, não a média: um soluço isolado (GC, captura) não derruba o dpr.
    let over = 0
    for (let i = 0; i < FRAME_WINDOW; i++) if (this.frameTimes[i]! > FRAME_BUDGET_MS) over++
    if (over > FRAME_WINDOW / 2) {
      this.dprIndex++
      const dpr = this.dprSteps[this.dprIndex]!
      this.renderer.setPixelRatio(dpr)
      this.burst.setPixelRatio(dpr)
    }
  }
}
