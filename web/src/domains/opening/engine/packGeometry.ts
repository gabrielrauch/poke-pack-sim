import { PlaneGeometry } from 'three'
import { packZ } from './packMath'

/**
 * Plano unitário (x, y ∈ [-0.5, 0.5]) com a frente estufada por `packZ`. `v0..v1` é a faixa vertical
 * do pacote que o mesh cobre (corpo 0..1, tira 0..STRIP_FRAC), para corpo e tira estufarem juntos e
 * a emenda sumir. z sai em fração da largura: o mesh usa `scale.set(w, h, w)`.
 */
export function packGeometry(segX: number, segY: number, v0 = 0, v1 = 1): PlaneGeometry {
  const geometry = new PlaneGeometry(1, 1, segX, segY)
  const pos = geometry.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5
    const v = v0 + (0.5 - pos.getY(i)) * (v1 - v0)
    pos.setZ(i, packZ(u, v))
  }
  geometry.computeVertexNormals()
  return geometry
}
