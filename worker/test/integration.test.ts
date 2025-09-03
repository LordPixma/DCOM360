/*
  Tiny integration harness: calls endpoints on a running dev server (wrangler dev)
  Usage:
    DEV_URL=http://127.0.0.1:8787 npx tsx test/integration.test.ts
*/
import assert from 'node:assert'

const DEV_URL = process.env.DEV_URL || 'http://127.0.0.1:8787'

async function get(path: string) {
  const res = await fetch(`${DEV_URL}${path}`, { headers: { 'accept': 'application/json' } })
  assert.strictEqual(res.ok, true, `Request failed: ${path} -> ${res.status}`)
  return res.json()
}

async function main() {
  const health = await get('/api/health')
  assert.strictEqual(health.success, true)

  const current = await get('/api/disasters/current?limit=5')
  assert.strictEqual(current.success, true)
  assert.ok(Array.isArray(current.data))

  const summary = await get('/api/disasters/summary')
  assert.strictEqual(summary.success, true)
  assert.ok(Array.isArray(summary.data.totals))

  const history = await get('/api/disasters/history?days=7')
  assert.strictEqual(history.success, true)
  assert.ok(Array.isArray(history.data))

  const countries = await get('/api/countries')
  assert.strictEqual(countries.success, true)
  assert.ok(Array.isArray(countries.data))

  console.log('Integration smoke tests passed.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
