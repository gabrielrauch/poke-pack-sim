import type { Bezier } from '../../../shared/lib/motion'

const clamp01 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x)

/** Mesmo solver do CSS: Newton (8 passos) com bissecção de reserva, amostrado por x. */
export function cubicBezier(curve: Bezier): (x: number) => number {
  const [x1, y1, x2, y2] = curve
  if (x1 === y1 && x2 === y2) return clamp01
  const ax = 1 - 3 * x2 + 3 * x1
  const bx = 3 * x2 - 6 * x1
  const cx = 3 * x1
  const ay = 1 - 3 * y2 + 3 * y1
  const by = 3 * y2 - 6 * y1
  const cy = 3 * y1
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  const solve = (x: number) => {
    let t = x
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x
      if (Math.abs(dx) < 1e-6) return t
      const s = slopeX(t)
      if (Math.abs(s) < 1e-6) break
      t -= dx / s
    }
    let lo = 0
    let hi = 1
    t = x
    for (let i = 0; i < 24; i++) {
      const dx = sampleX(t) - x
      if (Math.abs(dx) < 1e-6) break
      if (dx > 0) hi = t
      else lo = t
      t = (lo + hi) / 2
    }
    return t
  }
  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solve(x)))
}

const solvers = new WeakMap<Bezier, (x: number) => number>()
function easingFor(curve: Bezier): (x: number) => number {
  let fn = solvers.get(curve)
  if (!fn) {
    fn = cubicBezier(curve)
    solvers.set(curve, fn)
  }
  return fn
}

type NumericKeys<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T] & string
/** Só propriedades numéricas do alvo (Vector3.x, Euler.y, Material.opacity, Color.r, uniform.value). */
export type Props<T extends object> = Partial<Record<NumericKeys<T>, number>>
export type Frame<T extends object> = { at: number; to: Props<T> }
export type TweenOptions = {
  duration: number
  easing?: Bezier
  delay?: number
  onComplete?: () => void
}
export type Tween = { readonly done: boolean; cancel(): void }

const LINEAR: Bezier = [0, 0, 1, 1]

type Active = {
  target: Record<string, number>
  keys: string[]
  frames: { at: number; values: number[] }[] | null
  end: number[] | null
  start: number
  delay: number
  duration: number
  ease: (x: number) => number
  onComplete: (() => void) | undefined
  done: boolean
}

function apply(a: Active, p: number): void {
  const frames = a.frames!
  let i = 1
  while (i < frames.length - 1 && frames[i]!.at < p) i++
  const f0 = frames[i - 1]!
  const f1 = frames[i]!
  const span = f1.at - f0.at
  const u = span > 0 ? (p - f0.at) / span : 1
  for (let k = 0; k < a.keys.length; k++) {
    const v0 = f0.values[k]!
    a.target[a.keys[k]!] = v0 + (f1.values[k]! - v0) * u
  }
}

/** Gerenciador único da cena: `update(now)` a cada frame, zero alocação (listas fixas, swap-and-pop). */
export class Tweens {
  /** 1 = tempo real; 0,5 = metade das durações (prefers-reduced-motion, §8). */
  timeScale = 1
  private readonly list: Active[] = []
  /** `now` do `update()` em andamento, para tweens agendados por um `onComplete` (começam neste mesmo frame). */
  private updatingNow: number | null = null
  private readonly completed: Array<() => void> = []

  get active(): number {
    return this.list.length
  }

  /** Do valor atual (capturado quando começa) até `to`. */
  to<T extends object>(target: T, to: Props<T>, opts: TweenOptions): Tween {
    const record = to as Record<string, number>
    const keys = Object.keys(record)
    return this.push(
      target,
      keys,
      null,
      keys.map((k) => record[k]!),
      opts,
    )
  }

  /** Quadros explícitos (o primeiro em `at: 0`), todos com as mesmas propriedades. */
  keyframes<T extends object>(target: T, frames: Frame<T>[], opts: TweenOptions): Tween {
    if (frames.length < 2 || frames[0]!.at !== 0) {
      throw new RangeError('keyframes precisam de ao menos 2 quadros, o primeiro em at: 0')
    }
    const keys = Object.keys(frames[0]!.to)
    const built = frames.map((frame, i) => {
      if (i > 0 && frame.at <= frames[i - 1]!.at)
        throw new RangeError('keyframes precisam de at crescente')
      const record = frame.to as Record<string, number | undefined>
      return {
        at: frame.at,
        values: keys.map((k) => {
          const v = record[k]
          if (v === undefined) throw new RangeError(`keyframe sem a propriedade ${k}`)
          return v
        }),
      }
    })
    return this.push(target, keys, built, null, opts)
  }

  /** Chama `fn` depois de `ms` no relógio dos tweens (pausa junto com a cena). */
  after(ms: number, fn: () => void): Tween {
    return this.push({}, [], [], null, { duration: 0, delay: ms, onComplete: fn })
  }

  /**
   * Percorre de trás para a frente com swap-and-pop; `onComplete` só roda depois da travessia
   * (tweens que ele cria ou cancela não mexem em índices ainda não visitados) e `updatingNow`
   * fica válido durante os callbacks para o encadeamento começar neste mesmo instante.
   */
  update(now: number): void {
    this.updatingNow = now
    const list = this.list
    const completed = this.completed
    try {
      for (let i = list.length - 1; i >= 0; i--) {
        const a = list[i]!
        if (a.start < 0) a.start = now + a.delay * this.timeScale
        if (now < a.start) continue
        if (!a.frames) {
          a.frames = [
            { at: 0, values: a.keys.map((k) => a.target[k] ?? 0) },
            { at: 1, values: a.end! },
          ]
        }
        const duration = a.duration * this.timeScale
        const raw = duration <= 0 ? 1 : Math.min(1, (now - a.start) / duration)
        if (a.keys.length > 0) apply(a, a.ease(raw))
        if (raw >= 1) {
          a.done = true
          list[i] = list[list.length - 1]!
          list.pop()
          if (a.onComplete) completed.push(a.onComplete)
        }
      }
      for (let i = 0; i < completed.length; i++) completed[i]!()
    } finally {
      completed.length = 0
      this.updatingNow = null
    }
  }

  cancelAll(): void {
    for (const a of this.list) a.done = true
    this.list.length = 0
  }

  private push(
    target: object,
    keys: string[],
    frames: Active['frames'],
    end: number[] | null,
    opts: TweenOptions,
  ): Tween {
    const list = this.list
    const delay = opts.delay ?? 0
    const a: Active = {
      target: target as Record<string, number>,
      keys,
      frames,
      end,
      start: this.updatingNow === null ? -1 : this.updatingNow + delay * this.timeScale,
      delay,
      duration: opts.duration,
      ease: easingFor(opts.easing ?? LINEAR),
      onComplete: opts.onComplete,
      done: false,
    }
    list.push(a)
    return {
      get done() {
        return a.done
      },
      cancel() {
        if (a.done) return
        a.done = true
        const i = list.indexOf(a)
        if (i >= 0) {
          list[i] = list[list.length - 1]!
          list.pop()
        }
      },
    }
  }
}
