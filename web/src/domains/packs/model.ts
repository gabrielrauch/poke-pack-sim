import recipe from '../../../../src/pack/recipes/sv.json'
import { ApiError } from '../../shared/lib/http'
import type { Tier } from '../catalog/model'

/** Carta como `POST /api/packs` devolve (e como fica gravada em `packs.cards`). */
export type PackCard = {
  n: string
  name: string
  tier: Tier
  reverse: boolean
  img: string | null
  new: boolean
}

/** Resposta de `POST /api/packs` (§5). `packs_available` já é o saldo depois desta abertura. */
export type OpenedPack = {
  pack_id: string
  set_id: string
  opened_at: string
  cards: PackCard[]
  hit: boolean
  packs_available: number
}

/** Gerado antes da requisição e reutilizado na retentativa (§7.2). Sem `randomUUID` (http na LAN), 32 chars de base36. */
export function newPackId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID()
  return Array.from({ length: 4 }, () =>
    Math.random().toString(36).slice(2, 10).padEnd(8, '0'),
  ).join('')
}

export type OpenFailure =
  | { kind: 'offline' }
  | { kind: 'unauthorized' }
  | { kind: 'no_packs'; nextRefillAt: string | null }
  | { kind: 'unavailable' }
  | { kind: 'unknown'; code: string }

/** Erro da query de abertura (ou do catálogo) → o que a tela mostra. Fora de `ApiError` é rede. */
export function classifyOpenError(err: unknown): OpenFailure {
  if (!(err instanceof ApiError)) return { kind: 'offline' }
  if (err.status === 401) return { kind: 'unauthorized' }
  if (err.code === 'NO_PACKS') {
    const body = err.body as { next_refill_at?: unknown } | null
    const at = body?.next_refill_at
    return { kind: 'no_packs', nextRefillAt: typeof at === 'string' ? at : null }
  }
  if (err.status === 503) return { kind: 'unavailable' }
  return { kind: 'unknown', code: err.code }
}

export type FailureText = { title: string; detail: string; retry: boolean }

export function openFailureText(f: OpenFailure, timeZone?: string): FailureText {
  switch (f.kind) {
    case 'offline':
      return {
        title: 'Sem conexão',
        detail: 'Abrir pacote precisa de internet. Tenta de novo.',
        retry: true,
      }
    case 'unauthorized':
      return {
        title: 'Link de acesso inválido',
        detail: 'Abre o app pelo link que você recebeu.',
        retry: false,
      }
    case 'no_packs':
      return {
        title: 'Sem pacotes agora',
        detail: f.nextRefillAt
          ? `O próximo chega às ${formatTime(f.nextRefillAt, timeZone)}.`
          : 'Volta na próxima recarga.',
        retry: false,
      }
    case 'unavailable':
      return {
        title: 'O catálogo está fora do ar',
        detail: 'Tenta de novo daqui a pouco.',
        retry: true,
      }
    case 'unknown':
      return { title: 'Deu ruim', detail: `Erro ${f.code}. Tenta de novo.`, retry: true }
  }
}

function formatTime(iso: string, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  if (timeZone) opts.timeZone = timeZone
  return new Intl.DateTimeFormat('pt-BR', opts).format(new Date(iso))
}

/** Botão do resumo (§7.1): "Abrir outro pacote" ou "Volta mais tarde". */
export function againLabel(packsAvailable: number): string {
  return packsAvailable > 0 ? 'Abrir outro pacote' : 'Volta mais tarde'
}

/** Chip do cabeçalho depois de abrir. */
export function packsLeftText(packsAvailable: number): string {
  if (packsAvailable <= 0) return 'Último por agora'
  return packsAvailable === 1 ? '1 pacote restante' : `${packsAvailable} pacotes restantes`
}

const ALLOWANCE = recipe.allowance

export function quotaText(packsAvailable: number): string {
  if (packsAvailable <= 0) return 'Sem pacotes agora'
  return packsAvailable === 1 ? '1 pacote para abrir' : `${packsAvailable} pacotes para abrir`
}

/** "Mais 25 às 21:00", "Volta às 21:00" (sem pacotes) ou "Cota cheia" (recarga não acrescenta nada). */
export function refillText(
  nextRefillAt: string,
  packsAvailable: number,
  timeZone?: string,
): string {
  const gain = Math.min(ALLOWANCE.amount, ALLOWANCE.cap - packsAvailable)
  if (gain <= 0) return 'Cota cheia'
  const at = formatTime(nextRefillAt, timeZone)
  return packsAvailable <= 0 ? `Volta às ${at}` : `Mais ${gain} às ${at}`
}

export function openedCountText(total: number): string {
  if (total <= 0) return 'Nenhum pacote aberto'
  return total === 1 ? '1 pacote aberto' : `${total} pacotes abertos`
}
