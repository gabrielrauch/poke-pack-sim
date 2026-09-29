import { BufferAttribute, BufferGeometry } from 'three'

/** Contorno do retângulo arredondado (largura 1, altura `aspect`, raio em frações da largura), sentido anti-horário. */
export function roundedOutline(
  aspect: number,
  radius: number,
  cornerSegments: number,
): { x: number; y: number; nx: number; ny: number }[] {
  const hx = 0.5 - radius
  const hy = aspect / 2 - radius
  // Centros dos cantos, começando pelo superior direito, cada um varrendo 90° a partir do ângulo dado.
  const corners = [
    { cx: hx, cy: hy, a0: 0 },
    { cx: -hx, cy: hy, a0: Math.PI / 2 },
    { cx: -hx, cy: -hy, a0: Math.PI },
    { cx: hx, cy: -hy, a0: (3 * Math.PI) / 2 },
  ]
  const out: { x: number; y: number; nx: number; ny: number }[] = []
  for (const c of corners) {
    for (let i = 0; i <= cornerSegments; i++) {
      const a = c.a0 + (i / cornerSegments) * (Math.PI / 2)
      const nx = Math.cos(a)
      const ny = Math.sin(a)
      out.push({ x: c.cx + nx * radius, y: c.cy + ny * radius, nx, ny })
    }
  }
  return out
}

/**
 * A borda da carta: uma fita em volta do contorno arredondado, de z = -0,5 a 0,5, normais para fora.
 * Escala do mesh: (largura, largura, espessura), então os cantos seguem redondos como os do shader.
 */
export function cardEdgeGeometry(
  aspect: number,
  radius: number,
  cornerSegments = 6,
): BufferGeometry {
  const ring = roundedOutline(aspect, radius, cornerSegments)
  const n = ring.length
  const position = new Float32Array(n * 2 * 3)
  const normal = new Float32Array(n * 2 * 3)
  ring.forEach((p, i) => {
    for (let side = 0; side < 2; side++) {
      const o = (i * 2 + side) * 3
      position[o] = p.x
      position[o + 1] = p.y
      position[o + 2] = side === 0 ? 0.5 : -0.5
      normal[o] = p.nx
      normal[o + 1] = p.ny
      normal[o + 2] = 0
    }
  })
  const index: number[] = []
  for (let i = 0; i < n; i++) {
    const a = i * 2
    const b = ((i + 1) % n) * 2
    // Anti-horário visto de fora (normal para fora): frente-atual, trás-atual, trás-próximo, frente-próximo.
    index.push(a, a + 1, b + 1, a, b + 1, b)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setAttribute('normal', new BufferAttribute(normal, 3))
  geometry.setIndex(index)
  return geometry
}
