// Cria a usuária com um token novo e imprime o link de acesso.
// Uso: pnpm user:create "Nome" [--remote]
import { execFileSync } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'

const name = process.argv[2]
if (!name) {
  console.error('uso: pnpm user:create "Nome" [--remote]')
  process.exit(1)
}
const remote = process.argv.includes('--remote')
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

const token = randomBytes(32).toString('base64url')
const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex')
const id = randomUUID()
const escaped = name.replaceAll("'", "''")

// last_refill_date = hoje: a primeira abertura não recarrega por cima dos 3 iniciais.
const sql = `INSERT INTO users (id, name, token_hash, packs_available, last_refill_date) VALUES ('${id}', '${escaped}', '${tokenHash}', 3, '${today}');`

execFileSync(
  'pnpm',
  [
    'exec',
    'wrangler',
    'd1',
    'execute',
    'pack-sim',
    remote ? '--remote' : '--local',
    '--command',
    sql,
  ],
  { stdio: 'inherit' },
)

console.log(`\nusuária ${name} criada (${remote ? 'remote' : 'local'}), id ${id}`)
console.log(`token (não fica salvo em lugar nenhum): ${token}`)
console.log(`link local:  http://localhost:8787/#t=${token}`)
console.log(`link prod:   https://<worker>.workers.dev/#t=${token}`)
