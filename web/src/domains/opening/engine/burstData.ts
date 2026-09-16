/** Partículas do burst (§8.8): 42 (illustration/ultra), 58 (special), 72 (hyper). */
export const BURST_MAX = 72

export function burstCount(tier: string): number {
  return tier === 'hyper_rare' ? 72 : tier === 'special_illustration_rare' ? 58 : 42
}

/** Buffers criados uma vez; a cada burst só são reescritos (zero alocação). */
export type BurstAttributes = {
  angle: Float32Array
  dist: Float32Array
  scale: Float32Array
  delay: Float32Array
  dur: Float32Array
  /** rgb por partícula (itemSize 3). */
  color: Float32Array
  star: Float32Array
}

export function createBurstAttributes(max = BURST_MAX): BurstAttributes {
  return {
    angle: new Float32Array(max),
    dist: new Float32Array(max),
    scale: new Float32Array(max),
    delay: new Float32Array(max),
    dur: new Float32Array(max),
    color: new Float32Array(max * 3),
    star: new Float32Array(max),
  }
}

export type Palette = ReadonlyArray<readonly [number, number, number]>

/** Direção aleatória, 90–290px, scale .5–1.7, atraso até 90ms, 700–1300ms; 1 em 5 é estrela; cores em rodízio. */
export function fillBurst(
  a: BurstAttributes,
  count: number,
  palette: Palette,
  rng: () => number,
): void {
  const max = a.angle.length
  for (let i = 0; i < max; i++) {
    const on = i < count
    a.angle[i] = on ? rng() * Math.PI * 2 : 0
    a.dist[i] = on ? 90 + rng() * 200 : 0
    a.scale[i] = on ? 0.5 + rng() * 1.2 : 0
    a.delay[i] = on ? rng() * 90 : 0
    a.dur[i] = on ? 700 + rng() * 600 : 1
    a.star[i] = on && i % 5 === 0 ? 1 : 0
    const c = palette[i % palette.length]!
    a.color[i * 3] = c[0]
    a.color[i * 3 + 1] = c[1]
    a.color[i * 3 + 2] = c[2]
  }
}
