let cached: boolean | null = null

/** WebGL2 disponível? (three ≥ r163 exige.) Um canvas fora do DOM, uma vez; `false` em qualquer erro. */
export function hasWebGL2(): boolean {
  if (cached !== null) return cached
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    cached = gl !== null
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    cached = false
  }
  return cached
}
