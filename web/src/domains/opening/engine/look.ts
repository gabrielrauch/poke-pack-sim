/**
 * Corpo e luz da carta (fase 2 do plano): espessura, luz da cena, sombra e mola do tilt. Todos os
 * números que a bancada do /lab ajusta ao vivo moram aqui; o "Copiar valores" da bancada devolve este
 * mesmo formato para colar de volta.
 */
export type CardLook = {
  /** Espessura como fração da largura (carta real: 0,5%; exagerada para a borda aparecer na tela). */
  thickness: number
  /** Cor do miolo da borda (o papelão branco da carta). */
  edgeColor: [number, number, number]
  /** Brilho especular que atravessa a carta quando ela vira para a luz (0 desliga). */
  sheen: number
  /** Expoente do especular: maior = ponto de luz menor e mais duro. */
  shininess: number
  /** Quanto a carta escurece ao virar para longe da luz (0 = sem sombreamento). */
  shade: number
  /** Clareia a carta de raspão (Fresnel), como verniz. */
  rim: number
  /** Opacidade da sombra de contato (0 desliga). */
  shadowOpacity: number
  /** Deslocamento da sombra em px por unidade de "altura" (luz de cima à esquerda). */
  shadowOffset: [number, number]
  /** Giro máximo (graus) da carta em foco com o tilt em ±1. */
  tiltDeg: { x: number; y: number }
  /** Mola do tilt: rigidez (1/s²) e amortecimento (1/s). ζ = amortecimento / (2√rigidez). */
  spring: { stiffness: number; damping: number }
}

export const CARD_LOOK: CardLook = {
  thickness: 0.012,
  edgeColor: [0.93, 0.93, 0.95],
  sheen: 0.22,
  shininess: 36,
  shade: 0.14,
  rim: 0.12,
  shadowOpacity: 0.45,
  shadowOffset: [9, -15],
  tiltDeg: { x: 11, y: 13 },
  spring: { stiffness: 130, damping: 15 },
}

/** Luz principal da cena em coordenadas de mundo (= de câmera: a câmera não gira): acima, à esquerda, quase de frente. */
export const LIGHT_DIR: [number, number, number] = normalize([-0.22, 0.3, 0.93])

/** "Altura" da carta sobre a mesa, que afasta e esmaece a sombra: carta em foco mais alta que a pilha. */
export const SHADOW_LIFT = { stack: 0.35, focus: 1 } as const

/** Mescla parcial (da bancada ou de um JSON colado) sobre a base, sem aceitar chaves estranhas. */
export function mergeLook(base: CardLook, patch: Partial<CardLook>): CardLook {
  return {
    ...base,
    ...pick(patch),
    tiltDeg: { ...base.tiltDeg, ...patch.tiltDeg },
    spring: { ...base.spring, ...patch.spring },
  }
}

function pick(patch: Partial<CardLook>): Partial<CardLook> {
  const out: Partial<CardLook> = {}
  for (const key of Object.keys(CARD_LOOK) as (keyof CardLook)[]) {
    if (key === 'tiltDeg' || key === 'spring' || patch[key] === undefined) continue
    ;(out as Record<string, unknown>)[key] = patch[key]
  }
  return out
}

function normalize([x, y, z]: [number, number, number]): [number, number, number] {
  const l = Math.hypot(x, y, z)
  return [x / l, y / l, z / l]
}
