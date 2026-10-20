// 账本：裁剪、增量、跨实例持久化、与 store 的接线。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLedger, MAX_SCANS_PER_ROOT } from '../lib/src/ledger.mjs'
import { createStore } from '../lib/src/store.mjs'

async function withDir(run) {
  const dir = await mkdtemp(join(tmpdir(), 'disk-canvas-ledger-'))
  try {
    await run(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

const scan = (at, entries) => ({
  at,
  partial: false,
  totalBytes: entries.reduce((n, e) => n + e.bytes, 0),
  entries,
})

test('ledger: 扫描条数按上限裁剪', async () => {
  await withDir(async (dir) => {
    const ledger = createLedger({ dir, debounceMs: 0, now: () => 1000 })
    for (let i = 0; i < MAX_SCANS_PER_ROOT + 3; i += 1) {
      ledger.appendScan('/tmp/root', scan(i + 1, [{ path: '/tmp/root/a', name: 'a', kind: 'dir', bytes: i, files: 1 }]))
    }
    const history = ledger.history('/tmp/root', 100)
    assert.equal(history.length, MAX_SCANS_PER_ROOT)
    assert.equal(history.at(-1).at, MAX_SCANS_PER_ROOT + 3)
    ledger.flush()
  })
})

test('ledger: 两次扫描给出每个路径的差值', async () => {
  await withDir(async (dir) => {
    const ledger = createLedger({ dir, debounceMs: 0, now: () => 1000 })
    ledger.appendScan('/tmp/root', scan(1, [
      { path: '/tmp/root/a', name: 'a', kind: 'dir', bytes: 100, files: 1 },
      { path: '/tmp/root/b', name: 'b', kind: 'dir', bytes: 50, files: 1 },
    ]))
    ledger.appendScan('/tmp/root', scan(2, [
      { path: '/tmp/root/a', name: 'a', kind: 'dir', bytes: 180, files: 1 },
      { path: '/tmp/root/b', name: 'b', kind: 'dir', bytes: 40, files: 1 },
    ]))
    const delta = ledger.deltas('/tmp/root')
    assert.equal(delta.previousAt, 1)
    assert.equal(delta.totalDelta, 70)
    assert.equal(delta.byPath['/tmp/root/a'], 80)
    assert.equal(delta.byPath['/tmp/root/b'], -10)
    ledger.flush()
  })
})

test('ledger: 标注跨实例持久（写盘后重开仍在）', async () => {
  await withDir(async (dir) => {
    const first = createLedger({ dir, debounceMs: 0, now: () => 1000 })
    first.setAnnotation('/tmp/root/a', { decision: 'delete', note: '缓存', by: 'human' })
    first.setClaim('/tmp/root/a', { claim: '缓存目录', category: 'cache', confidence: 0.8, by: 'agent' })
    first.flush()
    const second = createLedger({ dir, debounceMs: 0, now: () => 1000 })
    assert.equal(second.annotations()['/tmp/root/a'].decision, 'delete')
    assert.equal(second.claims()['/tmp/root/a'].claim, '缓存目录')
    second.setAnnotation('/tmp/root/a', null)
    assert.equal(second.annotations()['/tmp/root/a'], undefined)
    second.flush()
  })
})

test('store + ledger: 决定与标注落账本，换 store 仍可见', async () => {
  await withDir(async (dir) => {
    const ledger = createLedger({ dir, debounceMs: 0, now: () => 1000 })
    const store = createStore({ ledger })
    store.startScan('/tmp/root')
    store.addEntry({ path: '/tmp/root/cache', name: 'cache', kind: 'dir', bytes: 100, files: 2, latestModified: 1 })
    store.finishScan({ partial: false, scannedAt: 10 })
    store.annotate({ path: '/tmp/root/cache', decision: 'delete', note: '可重建' })
    store.setClaim({ path: '/tmp/root/cache', claim: '应用缓存', category: 'cache', confidence: 0.9 })
    ledger.flush()

    const next = createStore({ ledger: createLedger({ dir, debounceMs: 0, now: () => 1000 }) })
    next.hydrate(ledger.latest('/tmp/root'))
    const snapshot = next.snapshot()
    assert.equal(snapshot.entries.length, 1)
    assert.equal(snapshot.entries[0].semantic.category, 'cache')
    assert.equal(snapshot.entries[0].source, 'agent')
    assert.equal(snapshot.plan.deleteCount, 1)
    assert.equal(snapshot.plan.reclaimBytes, 100)
  })
})
