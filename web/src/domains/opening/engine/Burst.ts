import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  type PlaneGeometry,
  type Texture,
} from 'three'
import { EASE, MS } from '../../../shared/lib/motion'
import { GOLD_TIERS } from '../../catalog/model'
import { BURST_MAX, burstCount, createBurstAttributes, fillBurst, type Palette } from './burstData'
import { canvasTexture } from './textures'
import type { Tweens } from './tween'

const RAYS_OPACITY = 0.42
const RING_OPACITY = 0.9
const RING_FROM = 0.4
const RING_TO = 2.6

/** Componentes sRGB (0..1) de uma cor CSS, para uniforms de shaders que escrevem direto no canvas. */
function srgb(css: string): [number, number, number] {
  const out = { r: 0, g: 0, b: 0 }
  new Color(css).getRGB(out, SRGBColorSpace)
  return [out.r, out.g, out.b]
}

const PASS_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const RAYS_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uAngle;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float a = atan(p.y, p.x) + uAngle;
  float seg = fract(a / 0.20071);                       // período de 11,5°
  float ray = step(0.7826, seg);                        // transparente 0–9°, cor 9–11,5°
  float r = length(p);
  float mask = r < 0.177 ? mix(1.0, 0.5, r / 0.177) : 0.5 * (1.0 - smoothstep(0.177, 0.389, r));
  gl_FragColor = vec4(uColor, ray * mask * uOpacity);
}
`

const POINTS_VERTEX = /* glsl */ `
attribute float aAngle;
attribute float aDist;
attribute float aScale;
attribute float aDelay;
attribute float aDur;
attribute vec3 aColor;
attribute float aStar;
uniform float uTime;
uniform float uT0;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;
varying float vStar;
void main() {
  float t = clamp((uTime - uT0 - aDelay) / aDur, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - t, 4.0);                    // aproxima cubic-bezier(.1,.8,.3,1)
  vec3 p = position + vec3(cos(aAngle) * aDist * e, sin(aAngle) * aDist * e + 40.0 * e, 0.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = mix(9.0, 16.0, aStar) * aScale * e * uPixelRatio * (1000.0 / -mv.z);
  vColor = aColor;
  vAlpha = 1.0 - e;
  vStar = aStar;
}
`

const POINTS_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vStar;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float circle = 1.0 - smoothstep(0.42, 0.5, length(q));
  float star = 1.0 - smoothstep(0.0, 0.06, pow(abs(q.x), 0.6) + pow(abs(q.y), 0.6) - 0.66);
  float a = mix(circle, star, vStar) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}
`

export class Burst {
  readonly group = new Group()
  private readonly rays: Mesh<PlaneGeometry, ShaderMaterial>
  private readonly ring: Mesh<PlaneGeometry, MeshBasicMaterial>
  private readonly points: Points<BufferGeometry, ShaderMaterial>
  private readonly ringTexture: Texture
  private readonly attrs = createBurstAttributes()
  private readonly goldPalette: Palette
  private readonly rosePalette: Palette
  private readonly gold: [number, number, number]
  private readonly rose: [number, number, number]
  private raysOn = false
  private pointsUntil = -1
  private ringBase = 0

  constructor(geometry: PlaneGeometry, colors: { gold: string; rose: string; violet: string }) {
    this.gold = srgb(colors.gold)
    this.rose = srgb(colors.rose)
    const white: [number, number, number] = [1, 1, 1]
    const violet = srgb(colors.violet)
    this.goldPalette = [this.gold, white, violet]
    this.rosePalette = [this.rose, white, violet]

    this.rays = new Mesh(
      geometry,
      new ShaderMaterial({
        uniforms: {
          uColor: { value: new Vector3(...this.gold) },
          uOpacity: { value: 0 },
          uAngle: { value: 0 },
        },
        vertexShader: PASS_VERTEX,
        fragmentShader: RAYS_FRAGMENT,
        transparent: true,
        blending: AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      }),
    )
    this.rays.position.z = -2
    this.rays.renderOrder = 3
    this.rays.visible = false

    this.ringTexture = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2)
      ctx.stroke()
    })
    this.ring = new Mesh(
      geometry,
      new MeshBasicMaterial({
        map: this.ringTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        opacity: 0,
      }),
    )
    this.ring.position.z = 5
    this.ring.renderOrder = 7
    this.ring.visible = false

    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(BURST_MAX * 3), 3))
    g.setAttribute('aAngle', new BufferAttribute(this.attrs.angle, 1))
    g.setAttribute('aDist', new BufferAttribute(this.attrs.dist, 1))
    g.setAttribute('aScale', new BufferAttribute(this.attrs.scale, 1))
    g.setAttribute('aDelay', new BufferAttribute(this.attrs.delay, 1))
    g.setAttribute('aDur', new BufferAttribute(this.attrs.dur, 1))
    g.setAttribute('aColor', new BufferAttribute(this.attrs.color, 3))
    g.setAttribute('aStar', new BufferAttribute(this.attrs.star, 1))
    this.points = new Points(
      g,
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uT0: { value: 0 }, uPixelRatio: { value: 1 } },
        vertexShader: POINTS_VERTEX,
        fragmentShader: POINTS_FRAGMENT,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    )
    this.points.position.z = 20
    this.points.renderOrder = 8
    this.points.frustumCulled = false
    this.points.visible = false

    this.group.add(this.rays, this.ring, this.points)
  }

  /** Raios com `min(170vmax, 1500px)`; anel com 60% da largura da carta. */
  layout(w: number, h: number, cardW: number): void {
    const size = Math.min(1.7 * Math.max(w, h), 1500)
    this.rays.scale.set(size, size, 1)
    this.ringBase = cardW * 0.6
  }

  setPixelRatio(dpr: number): void {
    this.points.material.uniforms.uPixelRatio!.value = dpr
  }

  /** Anel sempre; raios (fade 450) e partículas só sem `reduced` (§8). */
  fire(
    tier: string,
    now: number,
    tweens: Tweens,
    reduced = false,
    rng: () => number = Math.random,
  ): void {
    const gold = GOLD_TIERS.has(tier)
    const color = gold ? this.gold : this.rose
    if (!reduced) {
      ;(this.rays.material.uniforms.uColor!.value as Vector3).set(color[0], color[1], color[2])
      this.rays.visible = true
      this.raysOn = true
      tweens.to(
        this.rays.material.uniforms.uOpacity as { value: number },
        { value: RAYS_OPACITY },
        { duration: MS.raysFade },
      )
    }

    this.ring.visible = true
    this.ring.material.opacity = RING_OPACITY
    this.ring.scale.set(this.ringBase * RING_FROM, this.ringBase * RING_FROM, 1)
    tweens.to(
      this.ring.scale,
      { x: this.ringBase * RING_TO, y: this.ringBase * RING_TO },
      {
        duration: MS.ring,
        easing: EASE.ring,
      },
    )
    tweens.to(
      this.ring.material,
      { opacity: 0 },
      {
        duration: MS.ring,
        easing: EASE.ring,
        onComplete: () => {
          this.ring.visible = false
        },
      },
    )

    if (!reduced) {
      fillBurst(this.attrs, burstCount(tier), gold ? this.goldPalette : this.rosePalette, rng)
      const geometry = this.points.geometry
      for (const name of ['aAngle', 'aDist', 'aScale', 'aDelay', 'aDur', 'aColor', 'aStar']) {
        geometry.getAttribute(name).needsUpdate = true
      }
      this.points.material.uniforms.uT0!.value = now
      this.points.material.uniforms.uTime!.value = now
      this.points.visible = true
      this.pointsUntil = now + MS.burstMax
    }
  }

  /** Raios desligam no descarte (fade 450). */
  raysOff(tweens: Tweens): void {
    if (!this.raysOn) return
    this.raysOn = false
    tweens.to(
      this.rays.material.uniforms.uOpacity as { value: number },
      { value: 0 },
      {
        duration: MS.raysFade,
        onComplete: () => {
          if (!this.raysOn) this.rays.visible = false
        },
      },
    )
  }

  /** Giro dos raios e relógio das partículas; `true` enquanto algo está visível. */
  update(now: number): boolean {
    let busy = false
    if (this.rays.visible) {
      this.rays.material.uniforms.uAngle!.value = (now / MS.raysSpin) * Math.PI * 2
      busy = true
    }
    if (this.points.visible) {
      this.points.material.uniforms.uTime!.value = now
      if (now > this.pointsUntil) this.points.visible = false
      else busy = true
    }
    return busy
  }

  reset(): void {
    this.raysOn = false
    this.rays.visible = false
    this.rays.material.uniforms.uOpacity!.value = 0
    this.ring.visible = false
    this.points.visible = false
  }

  dispose(): void {
    this.rays.material.dispose()
    this.ring.material.dispose()
    this.ringTexture.dispose()
    this.points.material.dispose()
    this.points.geometry.dispose()
  }
}
