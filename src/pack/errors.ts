/** Recipe inválida ou catálogo sem cartas para o sorteio. Bug de configuração, não falha de rede. */
export class PackError extends Error {
  override readonly name = 'PackError'
}
