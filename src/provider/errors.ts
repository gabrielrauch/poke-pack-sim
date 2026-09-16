export type ProviderErrorCode =
  'UPSTREAM' | 'BAD_RESPONSE' | 'UNKNOWN_RARITY' | 'CARD_COUNT_MISMATCH'

export class ProviderError extends Error {
  readonly code: ProviderErrorCode

  constructor(code: ProviderErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ProviderError'
    this.code = code
  }
}
