/** Quatro uint32: os 16 primeiros bytes de SHA-256(pack_id), lidos big-endian pelo Worker. */
export type Seed = readonly [number, number, number, number]

export type Rng = {
  /** Inteiro uniforme em [0, 2^32). */
  nextU32(): number
  /** Float uniforme em [0, 1). */
  nextFloat(): number
}

const rotl = (x: number, k: number) => ((x << k) | (x >>> (32 - k))) >>> 0

/** xoshiro128** (Blackman & Vigna). Estado de 128 bits; seed toda zero vira [1, 0, 0, 0]. */
export function createRng(seed: Seed): Rng {
  let s0 = seed[0] >>> 0
  let s1 = seed[1] >>> 0
  let s2 = seed[2] >>> 0
  let s3 = seed[3] >>> 0
  if ((s0 | s1 | s2 | s3) === 0) s0 = 1

  const nextU32 = () => {
    const result = Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0
    const t = (s1 << 9) >>> 0
    s2 = (s2 ^ s0) >>> 0
    s3 = (s3 ^ s1) >>> 0
    s1 = (s1 ^ s2) >>> 0
    s0 = (s0 ^ s3) >>> 0
    s2 = (s2 ^ t) >>> 0
    s3 = rotl(s3, 11)
    return result
  }

  return { nextU32, nextFloat: () => nextU32() / 4294967296 }
}

export function seedFromBytes(bytes: Uint8Array): Seed {
  if (bytes.byteLength < 16) throw new RangeError(`seed needs 16 bytes, got ${bytes.byteLength}`)
  const view = new DataView(bytes.buffer, bytes.byteOffset, 16)
  return [
    view.getUint32(0, false),
    view.getUint32(4, false),
    view.getUint32(8, false),
    view.getUint32(12, false),
  ]
}

/** Sorteio ponderado. Com uma única entrada não consome o RNG (mantém sequências comparáveis). */
export function pickWeighted<T>(rng: Rng, entries: ReadonlyArray<readonly [T, number]>): T {
  if (entries.length === 0) throw new RangeError('pickWeighted needs at least one entry')
  let total = 0
  for (const [, weight] of entries) {
    if (!(Number.isFinite(weight) && weight > 0)) {
      throw new RangeError(`pickWeighted needs finite positive weights, got ${weight}`)
    }
    total += weight
  }
  if (!Number.isFinite(total)) throw new RangeError('pickWeighted weights overflow to Infinity')
  const last = entries[entries.length - 1]![0]
  if (entries.length === 1) return last
  const target = rng.nextFloat() * total
  let cumulative = 0
  for (let i = 0; i < entries.length - 1; i++) {
    cumulative += entries[i]![1]
    if (target < cumulative) return entries[i]![0]
  }
  return last
}
