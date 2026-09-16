type Parts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

/** Componentes da hora local via formatToParts (não depende de um locale específico formatar `YYYY-MM-DD`). */
function localParts(instant: Date, timeZone: string): Parts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** `YYYY-MM-DD` do instante no fuso dado. */
export function localDate(now: Date, timeZone: string): string {
  const { year, month, day } = localParts(now, timeZone)
  return `${year}-${pad(month)}-${pad(day)}`
}

/** Diferença (minutos) entre a hora local e UTC naquele instante. */
function offsetMinutes(instant: Date, timeZone: string): number {
  const p = localParts(instant, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - instant.getTime()) / 60_000)
}

/** Próxima meia-noite local, como instante UTC. Recalcula o offset no candidato para atravessar mudanças de horário. */
export function nextLocalMidnight(now: Date, timeZone: string): Date {
  const [year, month, day] = localDate(now, timeZone).split('-').map(Number) as [
    number,
    number,
    number,
  ]
  const naive = Date.UTC(year, month - 1, day + 1)
  const candidate = new Date(naive - offsetMinutes(new Date(naive), timeZone) * 60_000)
  return new Date(naive - offsetMinutes(candidate, timeZone) * 60_000)
}
