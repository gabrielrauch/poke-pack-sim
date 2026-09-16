import { describe, expect, it } from 'vitest'
import { MS } from '../../../shared/lib/motion'
import type { PackCard } from '../../packs/model'
import {
  FLIP,
  flipFrames,
  OPENING,
  OPENING_END,
  revealPlan,
  stackPose,
  transition,
} from './sequence'

const card = (tier: PackCard['tier']): PackCard => ({
  n: '001',
  name: 'x',
  tier,
  reverse: false,
  img: null,
  new: true,
})

describe('transition', () => {
  it('segue pack → tearing → opening → anim ⇄ card → summary → pack', () => {
    expect(transition('pack', 'tearStart')).toBe('tearing')
    expect(transition('tearing', 'tearCancel')).toBe('pack')
    expect(transition('tearing', 'tearComplete')).toBe('opening')
    expect(transition('pack', 'tearComplete')).toBe('opening')
    expect(transition('opening', 'opened')).toBe('anim')
    expect(transition('anim', 'revealed')).toBe('card')
    expect(transition('card', 'next')).toBe('anim')
    expect(transition('anim', 'finished')).toBe('summary')
    expect(transition('summary', 'again')).toBe('pack')
  })

  it('ignora eventos fora de hora (busy)', () => {
    expect(transition('anim', 'next')).toBeNull()
    expect(transition('opening', 'tearStart')).toBeNull()
    expect(transition('card', 'tearComplete')).toBeNull()
    expect(transition('pack', 'again')).toBeNull()
  })
})

describe('timeline §8.5', () => {
  it('a pilha assenta aos 1310 ms e o pacote some nesse instante', () => {
    expect(OPENING.settle.at + OPENING.settle.duration).toBe(1310)
    expect(OPENING.packGone.at).toBe(OPENING_END)
    expect(OPENING.rise.at).toBe(140)
    expect(OPENING.fall.at).toBe(440)
    expect(OPENING.strip.duration).toBe(MS.stripJump)
  })
})

describe('stackPose', () => {
  it('desloca 4px por nível e alterna o giro de 0,8°', () => {
    expect(stackPose(0).y).toBeCloseTo(0)
    expect(stackPose(0).rz).toBeCloseTo(0)
    expect(stackPose(1)).toEqual({ y: -4, rz: -0.8 })
    expect(stackPose(2)).toEqual({ y: -8, rz: 1.6 })
  })
})

describe('revealPlan', () => {
  it('só a última carta hit ganha suspense; hit vira mais devagar; rara vibra', () => {
    const plan = revealPlan([
      card('common'),
      card('rare'),
      card('illustration_rare'),
      card('uncommon'),
      card('hyper_rare'),
    ])
    expect(plan.map((p) => p.hit)).toEqual([false, false, true, false, true])
    expect(plan.map((p) => p.suspense)).toEqual([false, false, false, false, true])
    expect(plan.map((p) => p.flipMs)).toEqual([MS.flip, MS.flip, MS.flipHit, MS.flip, MS.flipHit])
    expect(plan.map((p) => p.buzz)).toEqual([false, true, false, false, false])
    expect(plan.map((p) => p.index)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('flipFrames', () => {
  it('converte os graus do §8.6 para radianos e mantém os offsets', () => {
    const f = flipFrames()
    expect(f.rotation.map((k) => k.at)).toEqual(FLIP.map((k) => k.at))
    expect(f.rotation[1]!.to.y).toBeCloseTo(Math.PI / 2)
    expect(f.rotation[3]!.to.y).toBeCloseTo(Math.PI)
    expect(f.position[1]!.to.y).toBe(34)
    expect(f.scale[1]!.to).toEqual({ x: 1.06, y: 1.06 })
  })
})
