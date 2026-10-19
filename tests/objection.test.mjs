// 异议：Agent 可以不同意人的决定，但只写一句话，不改决定；人改了决定，异议自动失效。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLedger } from '../lib/src/ledger.mjs'
import { createStore } from '../lib/src/store.mjs'

const ROOT = '/tmp/dc-obj-root'
const entry = (name) => ({ path: `${ROOT}/${name}`, name, kind: 'dir', bytes: 1000, files: 1, latestModified: Date.now() })

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'dc-obj-'))
  const ledger = createLedger({ dir })
  const store = createStore({ ledger })
  store.startScan(ROOT)
  store.addEntry(entry('a'))
  store.addEntry(entry('b'))
  store.finishScan({ partial: false, scannedAt: Date.now(), reason: 'refresh', patterns: [], patternsTruncated: false })
  return { dir, ledger, store }
}

test('objection: 只对「人做过的决定」生效，且不改决定', async () => {
  const { dir, store } = await setup()
  try {
    store.annotate({ path: `${ROOT}/a`, decision: 'keep' })
    const rec = store.setObjection({ path: `${ROOT}/a`, note: '这块其实是构建缓存，保留会一直占 2 GB' })
    assert.equal(rec.by, 'agent')
    const snap = store.snapshot()
    assert.equal(snap.annotations[`${ROOT}/a`].decision, 'keep', '决定没被改')
    assert.equal(snap.objections[`${ROOT}/a`].note, '这块其实是构建缓存，保留会一直占 2 GB')

    assert.throws(() => store.setObjection({ path: `${ROOT}/b`, note: 'x' }), /只能对已有的决定/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('objection: 人改了决定后失效，只改备注不失效', async () => {
  const { dir, store } = await setup()
  try {
    store.annotate({ path: `${ROOT}/a`, decision: 'keep' })
    store.setObjection({ path: `${ROOT}/a`, note: '我不同意' })

    store.annotate({ path: `${ROOT}/a`, note: '只加一句备注' })
    assert.ok(store.snapshot().objections[`${ROOT}/a`], '只改备注，异议还在')

    store.annotate({ path: `${ROOT}/a`, decision: 'delete' })
    assert.equal(store.snapshot().objections[`${ROOT}/a`], undefined, '决定变了，异议失效')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('objection: 不能对 Agent 自己的标注提异议', async () => {
  const { dir, store } = await setup()
  try {
    store.markPaths({ paths: [`${ROOT}/a`], decision: 'delete' })
    assert.throws(() => store.setObjection({ path: `${ROOT}/a`, note: 'x' }), /不需要异议/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
