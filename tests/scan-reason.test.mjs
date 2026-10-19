// 扫描的「语义」：换目录不等于做了一次测量；后台刷新不能白屏。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLedger } from '../lib/src/ledger.mjs'
import { createStore } from '../lib/src/store.mjs'

const ROOT = '/tmp/dc-scan-root'
const entry = (name, bytes) => ({ path: `${ROOT}/${name}`, name, kind: 'dir', bytes, files: 1, latestModified: Date.now() })

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'dc-scan-'))
  const ledger = createLedger({ dir })
  return { dir, ledger, store: createStore({ ledger }) }
}

test('scan reason: navigate 不写历史，refresh 才写', async () => {
  const { dir, ledger, store } = await setup()
  try {
    store.startScan(ROOT)
    store.addEntry(entry('a', 1000))
    store.finishScan({ partial: false, scannedAt: Date.now() - 1000, reason: 'navigate', patterns: [], patternsTruncated: false })
    assert.equal(ledger.history(ROOT, 10).length, 0)

    store.startScan(ROOT)
    store.addEntry(entry('a', 1000))
    store.finishScan({ partial: false, scannedAt: Date.now(), reason: 'refresh', patterns: [], patternsTruncated: false })
    assert.equal(ledger.history(ROOT, 10).length, 1)

    // 再路过一次：历史仍是 1 条，趋势不被导航污染
    store.startScan(ROOT)
    store.addEntry(entry('a', 1200))
    store.finishScan({ partial: false, scannedAt: Date.now() + 1000, reason: 'navigate', patterns: [], patternsTruncated: false })
    assert.equal(ledger.history(ROOT, 10).length, 1)
    assert.equal(store.snapshot().entries[0].bytes, 1200, '画面仍然更新到最新')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('scan reason: 后台刷新期间旧画面还在，扫完一次性替换', async () => {
  const { dir, store } = await setup()
  try {
    store.startScan(ROOT)
    store.addEntry(entry('old', 500))
    store.finishScan({ partial: false, scannedAt: Date.now(), reason: 'refresh', patterns: [], patternsTruncated: false })

    store.startScan(ROOT, { keep: true })
    assert.equal(store.state.scanning, true)
    assert.equal(store.state.revalidating, true)
    assert.deepEqual(store.snapshot().entries.map((e) => e.name), ['old'], '刷新时不白屏')

    store.addEntry(entry('fresh', 900))
    assert.deepEqual(store.snapshot().entries.map((e) => e.name), ['old'], '渐进结果先不打扰画面')

    store.finishScan({ partial: false, scannedAt: Date.now() + 50, reason: 'navigate', patterns: [], patternsTruncated: false })
    assert.deepEqual(store.snapshot().entries.map((e) => e.name), ['fresh'])
    assert.equal(store.state.revalidating, false)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('scan reason: hydrate 标 fromCache，真扫完清掉', async () => {
  const { dir, ledger, store } = await setup()
  try {
    store.startScan(ROOT)
    store.addEntry(entry('a', 100))
    store.finishScan({ partial: false, scannedAt: Date.now(), reason: 'refresh', patterns: [], patternsTruncated: false })

    const other = createStore({ ledger })
    other.hydrate(ledger.latest(ROOT))
    assert.equal(other.snapshot().fromCache, true)
    assert.equal(other.snapshot().revalidating, false)

    other.startScan(ROOT)
    assert.equal(other.snapshot().fromCache, false)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
