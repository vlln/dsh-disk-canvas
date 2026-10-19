// 语义的持久与保鲜：同一条判断在下一次扫描里该复用、该过期，还是该重标。
import test from 'node:test'
import assert from 'node:assert/strict'
import { snapshotOf, semanticState, dayOf } from '../lib/src/semantics.mjs'
import { createStore } from '../lib/src/store.mjs'

const ROOT = '/tmp/dc-sem-root'
const dir = (name, bytes, files = 500, mtime = 1_700_000_000_000) => ({
  path: `${ROOT}/${name}`, name, kind: 'dir', bytes, files, latestModified: mtime, partial: false,
})
const file = (name, bytes, mtime = 1_700_000_000_000) => ({
  path: `${ROOT}/${name}`, name, kind: 'file', bytes, files: 1, latestModified: mtime, partial: false,
})

function scan(store, entries, at) {
  store.startScan(ROOT)
  for (const e of entries) store.addEntry(e)
  store.finishScan({ partial: false, scannedAt: at, patterns: [], patternsTruncated: false })
}

test('semanticState: 目录小改不动，涨够比例和绝对量才过期', () => {
  const a = dir('a', 1_000_000)
  const m = snapshotOf(a)
  assert.equal(semanticState({ m }, a), 'fresh')
  assert.equal(semanticState({ m }, { ...a, bytes: 1_400_000 }), 'fresh')   // +40% 但不到 1 MB
  assert.equal(semanticState({ m }, { ...a, bytes: 4_000_000 }), 'stale')   // +300% 且 >1 MB
  assert.equal(semanticState({ m }, { ...a, files: 600 }), 'fresh')         // 文件数小改
  assert.equal(semanticState({ m }, { ...a, files: 5000 }), 'stale')
  assert.equal(semanticState({ m }, { ...a, latestModified: a.latestModified + 86_400_000 * 9 }), 'fresh')
})

test('semanticState: 文件只看内容与日期', () => {
  const f = file('f', 10)
  const m = snapshotOf(f)
  assert.equal(semanticState({ m }, f), 'fresh')
  assert.equal(semanticState({ m }, { ...f, bytes: 11 }), 'stale')
  assert.equal(semanticState({ m }, { ...f, latestModified: f.latestModified + 86_400_000 }), 'stale')
  assert.equal(dayOf(f.latestModified), m.day)
})

test('semanticState: 没语义 / 没快照 / 找不到对象', () => {
  const e = dir('a', 1000)
  assert.equal(semanticState(null, e), null)
  assert.equal(semanticState({}, e), 'stale')
  assert.equal(semanticState({ m: snapshotOf(e) }, null), 'orphan')
})

test('store: 写语义后再扫同一层判 fresh，变了判 stale 并进 pending', () => {
  const store = createStore()
  scan(store, [dir('a', 1_000_000), dir('b', 2_000_000)], Date.now() - 2000)
  store.setClaim({ path: `${ROOT}/a`, claim: '构建产物', label: '构建产物', category: '构建产物', evidence: ['有 .next 目录'] })

  let a = store.snapshot().entries.find((e) => e.name === 'a')
  assert.equal(a.semantic.state, 'fresh')
  assert.equal(a.semantic.label, '构建产物')
  assert.deepEqual(a.semantic.evidence, ['有 .next 目录'])

  // 同一层再扫一次：语义复用，不花模型
  scan(store, [dir('a', 1_000_000), dir('b', 2_000_000)], Date.now() - 1000)
  a = store.snapshot().entries.find((e) => e.name === 'a')
  assert.equal(a.semantic.state, 'fresh')
  assert.equal(store.pendingSemantics().some((p) => p.name === 'a'), false)

  // 体积翻了几倍：旧语义过期，进 pending 等重标
  scan(store, [dir('a', 9_000_000), dir('b', 2_000_000)], Date.now())
  a = store.snapshot().entries.find((e) => e.name === 'a')
  assert.equal(a.semantic.state, 'stale')
  assert.equal(a.semantic.claim, '构建产物')
  const pending = store.pendingSemantics()
  assert.deepEqual(pending.find((p) => p.name === 'a'), { path: `${ROOT}/a`, name: 'a', bytes: 9_000_000, reason: 'stale' })
  assert.equal(pending.find((p) => p.name === 'b').reason, 'new')
})

test('store: 不在当前层的路径也能写语义，落盘时没有快照', () => {
  const store = createStore()
  scan(store, [dir('a', 1000)], Date.now())
  const saved = store.setClaim({ path: '/tmp/elsewhere/node_modules', claim: '依赖目录', category: '依赖' })
  assert.equal(saved.m, undefined)
  assert.equal(store.snapshot().claims['/tmp/elsewhere/node_modules'].category, '依赖')
})
