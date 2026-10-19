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
  assert.equal(classify('/Users/me/Documents', { isDir: true }).risk, 'personal')
  assert.equal(classify('/Users/me/Projects/app/src', { isDir: true }).risk, 'personal')
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

test('store: 只写备注不改变决定，也不计入已审', () => {
  const store = createStore()
  scan(store, '/tmp/n', [{ path: '/tmp/n/x', name: 'x', kind: 'file', bytes: 1, files: 1, latestModified: 1 }])
  store.annotate({ path: '/tmp/n/x', note: '先记一笔' })
  let snap = store.snapshot()
  assert.equal(snap.annotations['/tmp/n/x'].note, '先记一笔')
  assert.equal(snap.annotations['/tmp/n/x'].decision, undefined)
  assert.equal(snap.plan.unreviewedCount, 1)
  assert.equal(snap.plan.deleteCount, 0)

  store.annotate({ path: '/tmp/n/x', decision: 'keep' })
  store.annotate({ path: '/tmp/n/x', note: '备份过了' })
  snap = store.snapshot()
  assert.equal(snap.annotations['/tmp/n/x'].decision, 'keep')
  assert.equal(snap.annotations['/tmp/n/x'].note, '备份过了')
  assert.equal(snap.plan.keepCount, 1)

  store.annotate({ path: '/tmp/n/x', decision: 'none' })
  snap = store.snapshot()
  assert.equal(snap.annotations['/tmp/n/x'].decision, undefined)
  assert.equal(snap.annotations['/tmp/n/x'].note, '备份过了')

  store.annotate({ path: '/tmp/n/x', note: '' })
  assert.equal(store.snapshot().annotations['/tmp/n/x'], undefined)
})

test('store: 批量标注一次写多个路径，去重且忽略非法路径', () => {
  const store = createStore()
  scan(store, '/tmp/m', [
    { path: '/tmp/m/a', name: 'a', kind: 'dir', bytes: 100, files: 1, latestModified: 1 },
    { path: '/tmp/m/b', name: 'b', kind: 'dir', bytes: 50, files: 1, latestModified: 1 },
    { path: '/tmp/m/c', name: 'c', kind: 'file', bytes: 10, files: 1, latestModified: 1 },
  ])
  const written = store.annotateMany({ paths: ['/tmp/m/a', '/tmp/m/b', '/tmp/m/a', 'relative', '/tmp/m/c'], decision: 'delete', note: '一起清' })
  assert.equal(written, 3)
  const snap = store.snapshot()
  assert.equal(snap.plan.deleteCount, 3)
  assert.equal(snap.plan.reclaimBytes, 160)
  assert.equal(snap.annotations['/tmp/m/a'].note, '一起清')
  assert.throws(() => store.annotateMany({ paths: [], decision: 'delete' }), /non-empty array/)
  assert.throws(() => store.annotateMany({ paths: ['/tmp/m/a'], decision: 'rm' }), /decision must be one of/)
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

test('scan: 跨层索引只收命中的目录名，并给出各自递归体积', async () => {
  const root = await mkdtemp(join(tmpdir(), 'disk-canvas-pat-'))
  try {
    await mkdir(join(root, 'projA', 'node_modules', 'pkg'), { recursive: true })
    await writeFile(join(root, 'projA', 'node_modules', 'pkg', 'index.js'), Buffer.alloc(1000))
    await mkdir(join(root, 'projA', 'node_modules', 'pkg2'), { recursive: true })
    await writeFile(join(root, 'projA', 'node_modules', 'pkg2', 'index.js'), Buffer.alloc(2000))
    await mkdir(join(root, 'projB', 'node_modules'), { recursive: true })
    await writeFile(join(root, 'projB', 'node_modules', 'a.js'), Buffer.alloc(500))
    await mkdir(join(root, 'Library', 'Caches'), { recursive: true })
    await writeFile(join(root, 'Library', 'Caches', 'c.bin'), Buffer.alloc(300))
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(join(root, 'src', 'main.js'), Buffer.alloc(100))

    const result = await scanChildren(root)
    const byPath = new Map(result.patterns.map((h) => [h.path, h]))
    const nmA = byPath.get(join(root, 'projA', 'node_modules'))
    const nmB = byPath.get(join(root, 'projB', 'node_modules'))
    const caches = byPath.get(join(root, 'Library', 'Caches'))
    assert.equal(nmA.group, 'node_modules')
    assert.equal(nmA.bytes, 3000)
    assert.equal(nmB.bytes, 500)
    assert.equal(caches.group, 'caches')
    assert.equal(caches.bytes, 300)
    assert.equal(result.patterns.length, 3, 'src 不该进索引')
    // 顶层体积仍是递归求和：projA 3000 + projB 500 + Library 300 + src 100
    const projA = result.entries.find((e) => e.name === 'projA')
    assert.equal(projA.bytes, 3000)
    assert.equal(result.entries.reduce((n, e) => n + e.bytes, 0), 3900)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('store: 索引按类分组、去掉嵌套重复、带决定', () => {
  const store = createStore()
  store.startScan('/tmp/idx')
  store.addEntry({ path: '/tmp/idx/a', name: 'a', kind: 'dir', bytes: 10, files: 1, latestModified: 1 })
  store.finishScan({
    partial: false,
    scannedAt: 5,
    patternsTruncated: false,
    patterns: [
      { path: '/tmp/idx/a/node_modules', name: 'node_modules', group: 'node_modules', bytes: 900, files: 9 },
      { path: '/tmp/idx/a/node_modules/x/node_modules', name: 'node_modules', group: 'node_modules', bytes: 400, files: 4 },
      { path: '/tmp/idx/b/Caches', name: 'Caches', group: 'caches', bytes: 300, files: 3 },
    ],
  })
  const snap = store.snapshot()
  const nm = snap.patterns.find((g) => g.id === 'node_modules')
  assert.equal(nm.count, 1, '嵌套的 node_modules 不该重复计数')
  assert.equal(nm.bytes, 900)
  assert.equal(snap.patterns.find((g) => g.id === 'caches').bytes, 300)
  assert.equal(snap.patternsAt, 5)

  const full = store.patterns()
  assert.equal(full.groups.find((g) => g.id === 'caches').entries[0].path, '/tmp/idx/b/Caches')

  store.annotateMany({ paths: ['/tmp/idx/b/Caches'], decision: 'delete' })
  assert.equal(store.patterns().groups.find((g) => g.id === 'caches').entries[0].decision, 'delete')
})

test('store: 记忆规则自动标记新扫到的同类目录，且不覆盖人的决定', () => {
  const store = createStore()
  store.startScan('/tmp/rule')
  store.addEntry({ path: '/tmp/rule/a', name: 'a', kind: 'dir', bytes: 10, files: 1, latestModified: 1 })
  store.finishScan({ partial: false, scannedAt: 1, patternsTruncated: false, patterns: [
    { path: '/tmp/rule/x/node_modules', name: 'node_modules', group: 'node_modules', bytes: 900, files: 9 },
    { path: '/tmp/rule/y/node_modules', name: 'node_modules', group: 'node_modules', bytes: 400, files: 4 },
  ] })
  assert.equal(store.snapshot().plan.deleteCount, 0)

  store.setRule({ id: 'node_modules', decision: 'delete' })
  let snap = store.snapshot()
  assert.equal(snap.annotations['/tmp/rule/x/node_modules'].decision, 'delete', '规则应立刻作用到已加载的索引')
  assert.equal(snap.annotations['/tmp/rule/x/node_modules'].by, 'rule')
  assert.equal(snap.rules.length, 1)
  assert.equal(store.exportPlan().extra.counts.delete, 2, '导出要带上索引里的决定')

  // 人工改成保留后，再扫描也不会被规则覆盖
  store.annotate({ path: '/tmp/rule/x/node_modules', decision: 'keep' })
  store.finishScan({ partial: false, scannedAt: 2, patternsTruncated: false, patterns: [
    { path: '/tmp/rule/x/node_modules', name: 'node_modules', group: 'node_modules', bytes: 900, files: 9 },
    { path: '/tmp/rule/y/node_modules', name: 'node_modules', group: 'node_modules', bytes: 400, files: 4 },
    { path: '/tmp/rule/z/node_modules', name: 'node_modules', group: 'node_modules', bytes: 100, files: 1 },
  ] })
  snap = store.snapshot()
  assert.equal(snap.annotations['/tmp/rule/x/node_modules'].decision, 'keep')
  assert.equal(snap.annotations['/tmp/rule/z/node_modules'].decision, 'delete', '新扫到的项才补')

  // 撤销规则：收回由它写下、且没被改过的决定
  store.setRule({ id: 'node_modules', decision: null })
  snap = store.snapshot()
  assert.equal(snap.annotations['/tmp/rule/y/node_modules'], undefined)
  assert.equal(snap.annotations['/tmp/rule/z/node_modules'], undefined)
  assert.equal(snap.annotations['/tmp/rule/x/node_modules'].decision, 'keep')
  assert.equal(snap.rules.length, 0)
})

test('store: 自动扫描间隔写入配置并夹在合理范围', () => {
  const store = createStore()
  assert.equal(store.snapshot().config.autoScanHours, 0)
  store.setConfig({ autoScanHours: 24 })
  assert.equal(store.snapshot().config.autoScanHours, 24)
  store.setConfig({ autoScanHours: 99999 })
  assert.equal(store.snapshot().config.autoScanHours, 720)
  store.setConfig({ autoScanHours: -5 })
  assert.equal(store.snapshot().config.autoScanHours, 0)
})

test('store: 提案导入只补缺，不覆盖已有决定', () => {
  const store = createStore()
  scan(store, '/tmp/imp', [
    { path: '/tmp/imp/a', name: 'a', kind: 'dir', bytes: 10, files: 1, latestModified: 1 },
    { path: '/tmp/imp/b', name: 'b', kind: 'dir', bytes: 20, files: 1, latestModified: 1 },
  ])
  store.annotate({ path: '/tmp/imp/a', decision: 'keep' })
  store.setRule({ id: 'caches', decision: 'keep' })

  const result = store.importProposal({
    annotations: {
      '/tmp/imp/a': { decision: 'delete', note: '别人标的' },
      '/tmp/imp/b': { decision: 'delete', note: '另一个人的判断' },
      '/tmp/imp/c': { decision: 'delete' },
      bad: { decision: 'delete' },
    },
    claims: { '/tmp/imp/b': { claim: '这是缓存', risk: 'caution', confidence: 0.8 } },
    rules: [{ id: 'node_modules', decision: 'delete' }, { id: 'caches', decision: 'delete' }],
  })
  assert.equal(result.decisions, 2, '导入 b 和计划外的 c（a 已有人做过决定）')
  assert.equal(result.skipped, 1, 'a 已有人做过决定')
  assert.equal(result.claims, 1)
  assert.equal(result.rules, 1, 'caches 已存在，只补 node_modules')

  const snap = store.snapshot()
  assert.equal(snap.annotations['/tmp/imp/a'].decision, 'keep')
  assert.equal(snap.annotations['/tmp/imp/b'].decision, 'delete')
  assert.equal(snap.annotations['/tmp/imp/b'].note, '另一个人的判断')
  assert.equal(snap.annotations['/tmp/imp/c'].decision, 'delete', '计划外的路径也照样记下')
  assert.equal(snap.rules.find((r) => r.id === 'node_modules').decision, 'delete')
  assert.equal(snap.rules.find((r) => r.id === 'caches').decision, 'keep')

  const exported = store.exportProposal()
  assert.equal(exported.kind, 'proposal')
  assert.equal(exported.root, '/tmp/imp')
  assert.equal(exported.annotations['/tmp/imp/b'].decision, 'delete')
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
