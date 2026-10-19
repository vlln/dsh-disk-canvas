// 执行台账：不设隔离区，只回答「上一轮标了待清理的项，这一轮还在不在」。
// 数据来源是扫描快照 + 人的决定，不需要脚本回写任何清单。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLedger } from '../lib/src/ledger.mjs'
import { createStore } from '../lib/src/store.mjs'

const ROOT = '/tmp/dc-exec-root'
const T1 = Date.now() - 3000
const T2 = Date.now() - 2000
const T3 = Date.now() - 1000
const entry = (name, bytes) => ({
  path: `${ROOT}/${name}`, name, kind: 'file', bytes, files: 1, latestModified: 1_700_000_000_000, partial: false,
})

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'dc-exec-'))
  const ledger = createLedger({ dir })
  return { dir, store: createStore({ ledger }), ledger }
}

test('执行台账：标了待清理的项消失后才记一笔，没标的不记', async () => {
  const { dir, store } = await setup()
  try {
    store.startScan(ROOT)
    store.addEntry(entry('a', 100))
    store.addEntry(entry('b', 200))
    store.finishScan({ partial: false, scannedAt: T1, patterns: [], patternsTruncated: false })
    store.annotate({ path: `${ROOT}/a`, decision: 'delete' })
    store.annotate({ path: `${ROOT}/b`, decision: 'keep' })

    store.startScan(ROOT)
    store.addEntry(entry('b', 200))
    store.finishScan({ partial: false, scannedAt: T2, patterns: [], patternsTruncated: false })

    const execs = store.snapshot().executions
    assert.equal(execs.length, 1)
    assert.equal(execs[0].count, 1)
    assert.equal(execs[0].bytes, 100)
    assert.deepEqual(execs[0].paths, [`${ROOT}/a`])
    assert.equal(execs[0].at, T2)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('执行台账：项还在就不记，跨实例仍读得到', async () => {
  const { dir, ledger, store } = await setup()
  try {
    store.startScan(ROOT)
    store.addEntry(entry('a', 100))
    store.finishScan({ partial: false, scannedAt: T1, patterns: [], patternsTruncated: false })
    store.annotate({ path: `${ROOT}/a`, decision: 'delete' })

    store.startScan(ROOT)
    store.addEntry(entry('a', 100))
    store.finishScan({ partial: false, scannedAt: T2, patterns: [], patternsTruncated: false })
    assert.equal(store.snapshot().executions.length, 0)

    store.startScan(ROOT)
    store.finishScan({ partial: false, scannedAt: T3, patterns: [], patternsTruncated: false })
    assert.equal(store.snapshot().executions.length, 1)

    // 换一个实例（模拟重启）：台账还在
    const again = createStore({ ledger })
    again.hydrate(ledger.latest(ROOT))
    assert.equal(again.snapshot().executions.length, 1)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
