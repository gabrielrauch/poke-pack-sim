import {
  AdditiveBlending,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  type PlaneGeometry,
  type Texture,
} from 'three'
import { EASE, MS } from '../../../shared/lib/motion'
import { withAlpha } from '../../../shared/lib/theme'
import { canvasTexture } from './textures'
import { cubicBezier, type Tweens } from './tween'

const FLECKS = 64
const FLECK_COLORS = ['#ffffff', '#ffd1ec', '#b9a7ff', '#ffe9a8']
const rad = (deg: number) => (deg * Math.PI) / 180

export class TearLine {
  readonly group = new Group()
  private readonly line: Mesh<PlaneGeometry, MeshBasicMaterial>
  private readonly tip: Mesh<PlaneGeometry, MeshBasicMaterial>
  private readonly flashMesh: Mesh<PlaneGeometry, MeshBasicMaterial>
  private readonly flecks: InstancedMesh<PlaneGeometry, MeshBasicMaterial>
  private readonly textures: Texture[]
  private packW = 0
  private lineY = 0
  private readonly fx = new Float32Array(FLECKS)
  private readonly fy = new Float32Array(FLECKS)
  private readonly fdx = new Float32Array(FLECKS)
  private readonly fdy = new Float32Array(FLECKS)
  private readonly frot = new Float32Array(FLECKS)
  private readonly fsize = new Float32Array(FLECKS)
  private readonly ftall = new Float32Array(FLECKS)
  private readonly flife = new Float32Array(FLECKS)
  private readonly fdur = new Float32Array(FLECKS)
  private readonly fcolor = new Float32Array(FLECKS * 3)
  private alive = 0
  private cursor = 0
  private readonly dummy = new Object3D()
  private readonly color = new Color()
  private readonly ease = cubicBezier(EASE.fleck)
  private readonly palette = FLECK_COLORS.map((c) => new Color(c))

  constructor(geometry: PlaneGeometry, rose: string) {
    const lineTex = canvasTexture(256, 32, (ctx, w, h) => {
      const glow = ctx.createLinearGradient(0, 0, 0, h)
      glow.addColorStop(0, withAlpha(rose, 0))
      glow.addColorStop(0.5, withAlpha(rose, 0.7))
      glow.addColorStop(1, withAlpha(rose, 0))
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)
      const core = ctx.createLinearGradient(0, 0, w, 0)
      core.addColorStop(0, 'rgba(255,255,255,.6)')
      core.addColorStop(1, '#fff')
      ctx.fillStyle = core
      ctx.fillRect(0, h / 2 - 2, w, 4)
    })
    const tipTex = canvasTexture(64, 64, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
      g.addColorStop(0, '#fff')
      g.addColorStop(0.24, '#fff')
      g.addColorStop(0.44, 'rgba(255,255,255,.5)')
      g.addColorStop(0.7, withAlpha(rose, 0.45))
      g.addColorStop(1, withAlpha(rose, 0))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    })
    const flashTex = canvasTexture(256, 128, (ctx, w, h) => {
      ctx.save()
      ctx.scale(1, h / w)
      const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2)
      g.addColorStop(0, '#fff')
      g.addColorStop(0.3, 'rgba(255,255,255,.5)')
      g.addColorStop(0.7, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, w)
      ctx.restore()
    })
    this.textures = [lineTex, tipTex, flashTex]
    const additive = (map: Texture) =>
      new MeshBasicMaterial({
        map,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        opacity: 0,
      })
    this.line = new Mesh(geometry, additive(lineTex))
    this.line.position.z = 4
    this.tip = new Mesh(geometry, additive(tipTex))
    this.tip.position.z = 5
    this.flashMesh = new Mesh(geometry, additive(flashTex))
    this.flashMesh.position.z = 6
    this.flecks = new InstancedMesh(
      geometry,
      new MeshBasicMaterial({
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
      FLECKS,
    )
    this.flecks.position.z = 5
    this.flecks.frustumCulled = false
    this.dummy.scale.set(0, 0, 1)
    this.dummy.updateMatrix()
    for (let i = 0; i < FLECKS; i++) {
      this.flecks.setMatrixAt(i, this.dummy.matrix)
      this.flecks.setColorAt(i, this.color.set(0x000000))
    }
    for (const m of [this.line, this.tip, this.flashMesh, this.flecks]) m.renderOrder = 3
    this.group.add(this.line, this.tip, this.flashMesh, this.flecks)
  }

  /** Linha a 20% do topo do pacote (§8.4); flash cobre a boca (§8.5). */
  layout(packW: number, packH: number): void {
    this.packW = packW
    this.lineY = packH * 0.3
    this.line.position.y = this.lineY
    this.line.scale.y = 12
    this.tip.position.y = this.lineY
    this.tip.scale.set(36, 36, 1)
    this.flashMesh.position.y = this.lineY
    this.flashMesh.scale.set(packW * 1.3, packH * 0.32, 1)
  }

  /** Linha de `a` até `b` (frações da largura), ponta no extremo da direção do arraste. */
  show(a: number, b: number, dir: number): void {
    const x0 = (a - 0.5) * this.packW
    const x1 = (b - 0.5) * this.packW
    this.line.position.x = (x0 + x1) / 2
    this.line.scale.x = Math.max(1, x1 - x0)
    this.line.material.opacity = 1
    this.tip.position.x = dir < 0 ? x0 : x1
    this.tip.material.opacity = 1
  }

  /** Corte completo: linha a 100% e brilho 2,6 → 1 em 450 ms; a ponta some. */
  setDone(tweens: Tweens): void {
    this.line.position.x = 0
    this.line.scale.x = this.packW
    this.line.material.opacity = 1
    this.line.material.color.setScalar(2.6)
    tweens.to(this.line.material.color, { r: 1, g: 1, b: 1 }, { duration: MS.cutFlash })
    this.tip.material.opacity = 0
  }

  hide(tweens: Tweens): void {
    tweens.to(this.line.material, { opacity: 0 }, { duration: MS.cutFade })
    this.tip.material.opacity = 0
  }

  /** Flash branco elíptico na boca: 0 → 1 (25%) → 0 em 380 ms. */
  playFlash(tweens: Tweens): void {
    tweens.keyframes(
      this.flashMesh.material,
      [
        { at: 0, to: { opacity: 0 } },
        { at: 0.25, to: { opacity: 1 } },
        { at: 1, to: { opacity: 0 } },
      ],
      { duration: MS.flash },
    )
  }

  /** §8.4: 2 lascas na ponta a cada 10%; §8.5: 26 ao longo da boca (`burst`). */
  spawnFlecks(xFrac: number, n: number, burst: boolean, rng: () => number = Math.random): void {
    for (let k = 0; k < n; k++) {
      let i = -1
      for (let tries = 0; tries < FLECKS; tries++) {
        const j = (this.cursor + tries) % FLECKS
        if (this.flife[j]! <= 0) {
          i = j
          break
        }
      }
      if (i < 0) return
      this.cursor = (i + 1) % FLECKS
      const x = burst ? rng() : Math.max(0, Math.min(1, xFrac + (rng() - 0.5) * 0.06))
      this.fx[i] = (x - 0.5) * this.packW
      this.fy[i] = this.lineY
      this.fdx[i] = (rng() - 0.5) * (burst ? 140 : 50)
      this.fdy[i] = 20 + rng() * (burst ? 140 : 60)
      this.frot[i] = (rng() - 0.5) * 300
      this.fsize[i] = 3 + rng() * 4
      this.ftall[i] = rng() < 0.5 ? 1 : 2
      this.fdur[i] = (burst ? 700 : 520) + rng() * 300
      this.flife[i] = 1e-3
      const c = this.palette[k % this.palette.length]!
      this.fcolor[i * 3] = c.r
      this.fcolor[i * 3 + 1] = c.g
      this.fcolor[i * 3 + 2] = c.b
      this.alive++
    }
  }

  /** Avança as lascas vivas; `true` enquanto houver alguma (mantém o loop ligado). */
  update(dt: number): boolean {
    if (this.alive === 0) return false
    for (let i = 0; i < FLECKS; i++) {
      if (this.flife[i]! <= 0) continue
      const life = this.flife[i]! + dt
      const dur = this.fdur[i]!
      if (life >= dur) {
        this.flife[i] = 0
        this.alive--
        this.dummy.scale.set(0, 0, 1)
      } else {
        this.flife[i] = life
        const p = this.ease(life / dur)
        this.dummy.position.set(this.fx[i]! + this.fdx[i]! * p, this.fy[i]! + this.fdy[i]! * p, 0)
        this.dummy.rotation.z = rad(this.frot[i]! * p)
        const s = this.fsize[i]!
        this.dummy.scale.set(s, s * this.ftall[i]!, 1)
        const k = 1 - p
        this.color.setRGB(
          this.fcolor[i * 3]! * k,
          this.fcolor[i * 3 + 1]! * k,
          this.fcolor[i * 3 + 2]! * k,
        )
        this.flecks.setColorAt(i, this.color)
      }
      this.dummy.updateMatrix()
      this.flecks.setMatrixAt(i, this.dummy.matrix)
    }
    this.flecks.instanceMatrix.needsUpdate = true
    if (this.flecks.instanceColor) this.flecks.instanceColor.needsUpdate = true
    return this.alive > 0
  }

  reset(): void {
    this.line.material.opacity = 0
    this.line.material.color.setScalar(1)
    this.tip.material.opacity = 0
    this.flashMesh.material.opacity = 0
    this.dummy.scale.set(0, 0, 1)
    this.dummy.updateMatrix()
    for (let i = 0; i < FLECKS; i++) {
      this.flife[i] = 0
      this.flecks.setMatrixAt(i, this.dummy.matrix)
    }
    this.flecks.instanceMatrix.needsUpdate = true
    this.alive = 0
  }

  dispose(): void {
    for (const t of this.textures) t.dispose()
    this.line.material.dispose()
    this.tip.material.dispose()
    this.flashMesh.material.dispose()
    this.flecks.material.dispose()
    this.flecks.dispose()
  }
}
