import { describe, expect, it } from 'vitest'
import { PackError } from './errors'

describe('PackError', () => {
  it('is an Error named PackError', () => {
    const error = new PackError('bad recipe')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('PackError')
    expect(error.message).toBe('bad recipe')
  })
})
