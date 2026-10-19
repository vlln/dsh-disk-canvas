// 分档提案：Agent 只摆选项，应用是人的动作；人做过的决定不被覆盖。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLedger } from '../lib/src/ledger.mjs'
import { createStore } from '../lib/src/store.mjs'

const ROOT = '/tmp/dc-prop-root'
const entry = (name, bytes) => ({ path: `${ROOT}/${name}`, name, kind: 'dir', bytes, files: 1, latestModified: Date.now() })

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'dc-prop-'))
  const ledger = createLedger({ dir })
  const store = createStore({ ledger })
  store.startScan(ROOT)
  for (const [name, bytes] of [['a', 1000], ['b', 2000], ['c', 3000]]) store.addEntry(entry(name, bytes))
  store.finishScan({ partial: false, scannedAt: Date.now(), reason: 'refresh', patterns: [], patternsTruncated: false })
  return { dir, ledger, store }
}

test('proposal: 落账本、算体积、跨实例读得到', async () => {
  const { dir, ledger, store } = await setup()
  try {
    const saved = store.setProposal({
      tiers: [
        { id: 'safe', name: '只清构建产物', paths: [`${ROOT}/a`], rationale: '可重装', regret: '重新编译一次' },
        { id: 'deep', name: '连缓存一起', paths: [`${ROOT}/a`, `${ROOT}/b`], rationale: '都能重建', regret: '首次启动变慢' },
      ],
      note: '先给两档',
    })
    assert.equal(saved.tiers.length, 2)
    assert.equal(saved.tiers[1].bytes, 3000)
    assert.equal(store.snapshot().proposals.length, 1)

    const again = createStore({ ledger })
    again.hydrate(ledger.latest(ROOT))
    assert.equal(again.snapshot().proposals[0].id, saved.id)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('proposal: 应用某一档只标未决定的项，人做过的不动', async () => {
  const { dir, store } = await setup()
  try {
    store.annotate({ path: `${ROOT}/b`, decision: 'keep', note: '我要留着' })
    const saved = store.setProposal({ tiers: [{ id: 'deep', name: '深度', paths: [`${ROOT}/a`, `${ROOT}/b`, `${ROOT}/c`] }] })
    const result = store.applyProposal({ proposalId: saved.id, tierId: 'deep' })
    assert.equal(result.applied, 2)
    assert.equal(result.skipped, 1)
    const ann = store.snapshot().annotations
    assert.equal(ann[`${ROOT}/a`].decision, 'delete')
    assert.equal(ann[`${ROOT}/b`].decision, 'keep', '人的保留不被提案覆盖')
    assert.equal(ann[`${ROOT}/c`].decision, 'delete')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('proposal: 非法输入被拒绝', async () => {
  const { dir, store } = await setup()
  try {
    assert.throws(() => store.setProposal({ tiers: [] }), /tiers required/)
    assert.throws(() => store.setProposal({ tiers: [{ name: 'x', paths: [] }] }), /paths required/)
    assert.throws(() => store.setProposal({ tiers: Array.from({ length: 4 }, () => ({ name: 'x', paths: [`${ROOT}/a`] })) }), /at most 3/)
    assert.throws(() => store.applyProposal({}), /no proposal/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('proposal: 重扫/换根时从账本载入该根的提案', async () => {
  const { dir, ledger, store } = await setup()
  try {
    const saved = store.setProposal({ tiers: [{ id: 'safe', name: '只清构建产物', paths: [`${ROOT}/a`] }] })
    const fresh = createStore({ ledger })
    fresh.startScan(ROOT)
    assert.equal(fresh.snapshot().proposals.length, 1)
    assert.equal(fresh.snapshot().proposals[0].id, saved.id)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
