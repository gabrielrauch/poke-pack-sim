// Captura respostas reais do TCGdex para os testes do provider.
// Uso: node scripts/capture-fixtures.ts sv03.5
import { mkdir, writeFile } from 'node:fs/promises'
import { CATALOG_QUERY, TCGDEX_GRAPHQL, catalogVariables } from '../src/provider/query.ts'

const setId = process.argv[2] ?? 'sv03.5'
const dir = 'src/provider/fixtures'
await mkdir(dir, { recursive: true })

for (const lang of ['en', 'pt']) {
  const res = await fetch(TCGDEX_GRAPHQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ query: CATALOG_QUERY, variables: catalogVariables(setId, lang) }),
  })
  if (!res.ok) throw new Error(`${lang}: HTTP ${res.status}`)
  const json = (await res.json()) as { data?: unknown; errors?: unknown }
  if (json.errors) throw new Error(`${lang}: ${JSON.stringify(json.errors)}`)
  const path = `${dir}/${setId}.${lang}.json`
  await writeFile(path, JSON.stringify(json.data, null, 2) + '\n')
  console.log(`wrote ${path}`)
}
