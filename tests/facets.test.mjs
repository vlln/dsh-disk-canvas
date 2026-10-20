// 类别 → 色号的分配：稳定、落账本、超出调色板就退化到中性色。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLedger } from '../lib/src/ledger.mjs'
import { createStore } from '../lib/src/store.mjs'

const ROOT = '/tmp/dc-hue-root'
const entry = (name) => ({ path: `${ROOT}/${name}`, name, kind: 'dir', bytes: 1000, files: 2, latestModified: Date.now() })

function scan(store, names) {
  store.startScan(ROOT)
  for (const name of names) store.addEntry(entry(name))
  store.finishScan({ partial: false, scannedAt: Date.now(), patterns: [], patternsTruncated: false })
}

test('facetHue: 同一类别固定色号，不同类别依次分配', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dc-hue-'))
  try {
    const ledger = createLedger({ dir })
    const store = createStore({ ledger })
    scan(store, ['a', 'b', 'c'])
    store.setClaim({ path: `${ROOT}/a`, claim: '依赖', category: 'deps' })
    store.setClaim({ path: `${ROOT}/b`, claim: '安装包', category: 'installer' })
    store.setClaim({ path: `${ROOT}/c`, claim: '也是依赖', category: 'deps' })

    let snap = store.snapshot()
    assert.equal(snap.entries.find((e) => e.name === 'a').facetHue, 0)
    assert.equal(snap.entries.find((e) => e.name === 'b').facetHue, 1)
    assert.equal(snap.entries.find((e) => e.name === 'c').facetHue, 0)
    assert.equal(snap.entries.find((e) => e.name === 'c').semantic.category, 'deps')

    // 换实例（模拟重启）：色号还在，不重排
    const again = createStore({ ledger })
    again.hydrate(ledger.latest(ROOT))
    snap = again.snapshot()
    assert.equal(snap.facetHue.deps, 0)
    assert.equal(snap.facetHue.installer, 1)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('facetHue: 超过 8 类退化到 -1，不再发明新颜色', () => {
  const store = createStore()
  const cats = ['project', 'deps', 'build', 'cache', 'installer', 'media', 'doc', 'system', 'other']
  const names = cats.map((_, i) => `d${i}`)
  scan(store, names)
  names.forEach((n, i) => store.setClaim({ path: `${ROOT}/${n}`, claim: `第 ${i} 类`, category: cats[i] }))
  const hues = store.snapshot().entries.map((e) => e.facetHue).sort((a, b) => a - b)
  assert.deepEqual(hues, [-1, 0, 1, 2, 3, 4, 5, 6, 7])
})

test('facetHue: 未标注的项没有色号', () => {
  const store = createStore()
  scan(store, ['a'])
  assert.equal(store.snapshot().entries[0].facetHue, -1)
  assert.equal(store.snapshot().entries[0].semantic, null)
})
