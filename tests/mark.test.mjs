// Agent 直接标决定：和用户按 K/D/U 写的是同一份数据；人标过的不覆盖；可以整批撤销。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLedger } from '../lib/src/ledger.mjs'
import { createStore } from '../lib/src/store.mjs'

const ROOT = '/tmp/dc-mark-root'
const entry = (name, bytes) => ({ path: `${ROOT}/${name}`, name, kind: 'dir', bytes, files: 1, latestModified: Date.now() })

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'dc-mark-'))
  const ledger = createLedger({ dir })
  const store = createStore({ ledger })
  store.startScan(ROOT)
  for (const [name, bytes] of [['a', 1000], ['b', 2000], ['c', 3000]]) store.addEntry(entry(name, bytes))
  store.finishScan({ partial: false, scannedAt: Date.now(), reason: 'refresh', patterns: [], patternsTruncated: false })
  return { dir, ledger, store }
}

test('mark: Agent 标一批 = 写同一份决定，画布立刻变成待清理', async () => {
  const { dir, ledger, store } = await setup()
  try {
    const batch = store.markPaths({ paths: [`${ROOT}/a`, `${ROOT}/b`], decision: 'delete', note: '构建产物' })
    assert.equal(batch.count, 2)
    assert.equal(batch.bytes, 3000)

    const snap = store.snapshot()
    assert.equal(snap.plan.deleteCount, 2)
    assert.equal(snap.plan.reclaimBytes, 3000)
    assert.equal(snap.annotations[`${ROOT}/a`].by, 'agent')
    assert.equal(snap.annotations[`${ROOT}/a`].batch, batch.id)
    assert.equal(snap.agentBatches.at(-1).id, batch.id)

    // 跨实例还在
    const again = createStore({ ledger })
    again.hydrate(ledger.latest(ROOT))
    assert.equal(again.snapshot().plan.deleteCount, 2)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('mark: 人标过的不覆盖，跳过并计数', async () => {
  const { dir, store } = await setup()
  try {
    store.annotate({ path: `${ROOT}/b`, decision: 'keep', note: '留着' })
    const batch = store.markPaths({ paths: [`${ROOT}/a`, `${ROOT}/b`, `${ROOT}/c`], decision: 'delete' })
    assert.equal(batch.count, 2)
    assert.equal(batch.skipped, 1)
    assert.equal(store.snapshot().annotations[`${ROOT}/b`].decision, 'keep')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('undo: 只撤这一批里 agent 标的；人后来改过的不动', async () => {
  const { dir, store } = await setup()
  try {
    const batch = store.markPaths({ paths: [`${ROOT}/a`, `${ROOT}/b`], decision: 'delete' })
    // 人把 b 改成保留（batch 标记随之清掉）
    store.annotate({ path: `${ROOT}/b`, decision: 'keep' })
    const result = store.undoAgentBatch({ batch: batch.id })
    assert.equal(result.removed, 1)
    const ann = store.snapshot().annotations
    assert.equal(ann[`${ROOT}/a`], undefined)
    assert.equal(ann[`${ROOT}/b`].decision, 'keep')
    assert.equal(store.snapshot().agentBatches.length, 0)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('mark: 非法输入被拒绝', async () => {
  const { dir, store } = await setup()
  try {
    assert.throws(() => store.markPaths({ paths: [], decision: 'delete' }), /paths required/)
    assert.throws(() => store.markPaths({ paths: [`${ROOT}/a`], decision: 'rm' }), /decision must be one of/)
    assert.throws(() => store.markPaths({ paths: [`${ROOT}/a`], decision: 'none' }), /decision must be one of/)
    assert.throws(() => store.undoAgentBatch({ batch: 'nope' }), /no such batch/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
