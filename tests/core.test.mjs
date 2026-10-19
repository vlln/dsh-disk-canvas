// 纯函数与前台的契约自证：规则、计划、批注覆盖、扫描体积。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { classify } from '../lib/src/rules.mjs'
import { createStore } from '../lib/src/store.mjs'
import { scanChildren } from '../lib/src/scan.mjs'

test('classify: 系统与个人目录是高危', () => {
  assert.equal(classify('/System/Library', { isDir: true }).risk, 'high')
  assert.equal(classify('/Users/me/Documents', { isDir: true }).risk, 'high')
  assert.equal(classify('/Users/me/Projects/app/src', { isDir: true }).risk, 'high')
})

test('classify: 安全的可清理项', () => {
  assert.equal(classify('/Users/me/.Trash', { isDir: true }).risk, 'safe')
  assert.equal(classify('/Users/me/Library/Logs', { isDir: true }).risk, 'safe')
  assert.equal(classify('/Users/me/x.log', { isDir: false }).risk, 'safe')
})

test('classify: 谨慎项与未知项', () => {
  assert.equal(classify('/Users/me/Library/Caches', { isDir: true }).risk, 'caution')
  assert.equal(classify('/Users/me/code/app/node_modules', { isDir: true }).risk, 'caution')
  const unknown = classify('/Users/me/whatever', { isDir: true })
  assert.equal(unknown.risk, 'unknown')
  assert.equal(unknown.confidence, 0)
})

function scan(store, root, entries) {
  store.startScan(root)
  for (const entry of entries) store.addEntry(entry)
  store.finishScan({ partial: false, scannedAt: Date.now() })
}

test('store: 标注决定后计划累计可释放体积', () => {
  const store = createStore()
  scan(store, '/tmp/root', [
    { path: '/tmp/root/a', name: 'a', kind: 'dir', bytes: 100, files: 1, latestModified: 1 },
    { path: '/tmp/root/b', name: 'b', kind: 'file', bytes: 50, files: 1, latestModified: 1 },
  ])
  store.annotate({ path: '/tmp/root/a', decision: 'delete', note: '缓存' })
  store.annotate({ path: '/tmp/root/b', decision: 'keep' })
  const snap = store.snapshot()
  assert.equal(snap.plan.deleteCount, 1)
  assert.equal(snap.plan.keepCount, 1)
  assert.equal(snap.plan.reclaimBytes, 100)
  assert.equal(snap.plan.unreviewedCount, 0)
  assert.equal(snap.annotations['/tmp/root/a'].note, '缓存')
})

test('store: 清除批注回到未审', () => {
  const store = createStore()
  scan(store, '/tmp/r', [{ path: '/tmp/r/x', name: 'x', kind: 'file', bytes: 1, files: 1, latestModified: 1 }])
  store.annotate({ path: '/tmp/r/x', decision: 'delete' })
  store.annotate({ path: '/tmp/r/x', decision: 'none' })
  assert.equal(store.snapshot().plan.unreviewedCount, 1)
})

test('store: Agent 标注覆盖规则推断并标记来源', () => {
  const store = createStore()
  scan(store, '/Users/me/Library', [{ path: '/Users/me/Library/Caches', name: 'Caches', kind: 'dir', bytes: 10, files: 1, latestModified: 1 }])
  store.setClaim({ path: '/Users/me/Library/Caches', claim: '视频剪辑缓存，删了要重新渲染', risk: 'caution', confidence: 0.8 })
  const entry = store.snapshot().entries[0]
  assert.equal(entry.source, 'agent')
  assert.equal(entry.claim, '视频剪辑缓存，删了要重新渲染')
  assert.equal(entry.risk, 'caution')
})

test('store: 非法决定被拒绝', () => {
  const store = createStore()
  assert.throws(() => store.annotate({ path: '/tmp/x', decision: 'rm -rf' }), /decision must be one of/)
})

test('scan: 目录体积是递归求和', async () => {
  const root = await mkdtemp(join(tmpdir(), 'disk-canvas-'))
  try {
    await mkdir(join(root, 'nested', 'deep'), { recursive: true })
    await writeFile(join(root, 'nested', 'a.bin'), Buffer.alloc(1000))
    await writeFile(join(root, 'nested', 'deep', 'b.bin'), Buffer.alloc(2000))
    await writeFile(join(root, 'top.bin'), Buffer.alloc(500))
    const result = await scanChildren(root)
    assert.equal(result.partial, false)
    const nested = result.entries.find((e) => e.name === 'nested')
    assert.equal(nested.bytes, 3000)
    assert.equal(nested.files, 2)
    const top = result.entries.find((e) => e.name === 'top.bin')
    assert.equal(top.bytes, 500)
    assert.equal(result.entries[0].name, 'nested')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('store: 渐进扫描期间 scanning=true，子项完成即可见', () => {
  const store = createStore()
  store.startScan('/tmp/progressive')
  assert.equal(store.snapshot().scanning, true)
  assert.equal(store.snapshot().entries.length, 0)
  store.addEntry({ path: '/tmp/progressive/a', name: 'a', kind: 'dir', bytes: 10, files: 1, latestModified: 1 })
  assert.equal(store.snapshot().entries.length, 1)
  assert.equal(store.snapshot().scanning, true)
  store.finishScan({ partial: true, scannedAt: 123 })
  const snap = store.snapshot()
  assert.equal(snap.scanning, false)
  assert.equal(snap.partial, true)
  assert.equal(snap.scannedAt, 123)
})
