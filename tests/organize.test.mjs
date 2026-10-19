// 整理的执行护栏：同盘、不覆盖、移不进自己的子目录、失败逐项报告。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { previewMove, executeMove, executeMoves } from '../lib/src/organize.mjs'

async function sandbox() {
  const root = await mkdtemp(join(tmpdir(), 'dc-org-'))
  await mkdir(join(root, 'src'), { recursive: true })
  await mkdir(join(root, 'dst'), { recursive: true })
  await writeFile(join(root, 'src', 'a.txt'), 'hello')
  return root
}

test('preview: 正常可移动，目标自动补文件名', async () => {
  const root = await sandbox()
  try {
    const row = await previewMove(join(root, 'src', 'a.txt'), join(root, 'dst'))
    assert.equal(row.ok, true)
    assert.equal(row.dest, join(root, 'dst', 'a.txt'))
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('preview: 目标已存在 / 源不存在 / 目标是源的子目录 / 目标不是目录', async () => {
  const root = await sandbox()
  try {
    await writeFile(join(root, 'dst', 'a.txt'), 'old')
    assert.equal((await previewMove(join(root, 'src', 'a.txt'), join(root, 'dst'))).reason, 'conflict')
    assert.equal((await previewMove(join(root, 'src', 'nope'), join(root, 'dst'))).reason, 'gone')
    assert.equal((await previewMove(join(root, 'src'), join(root, 'src', 'inner'))).reason, 'inside-source')
    await writeFile(join(root, 'file'), 'x')
    assert.equal((await previewMove(join(root, 'src', 'a.txt'), join(root, 'file'))).reason, 'not-a-directory')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('execute: 真的移动，并创建缺失的目标目录', async () => {
  const root = await sandbox()
  try {
    const target = join(root, 'new', 'deep')
    const res = await executeMove(join(root, 'src', 'a.txt'), target)
    assert.equal(res.ok, true)
    assert.equal((await stat(join(target, 'a.txt'))).isFile(), true)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('execute: 逐项执行，冲突项跳过不影响其它项', async () => {
  const root = await sandbox()
  try {
    await writeFile(join(root, 'src', 'b.txt'), 'two')
    await writeFile(join(root, 'dst', 'b.txt'), 'occupied')
    const results = await executeMoves([
      { op: 'move', path: join(root, 'src', 'a.txt'), to: join(root, 'dst') },
      { op: 'move', path: join(root, 'src', 'b.txt'), to: join(root, 'dst') },
    ])
    assert.deepEqual(results.map((r) => r.ok), [true, false])
    assert.equal(results[1].reason, 'conflict')
    assert.equal((await stat(join(root, 'dst', 'a.txt'))).isFile(), true)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('execute: 目标写成 / 直接拒绝', async () => {
  const root = await sandbox()
  try {
    const res = await executeMove(join(root, 'src', 'a.txt'), '/')
    assert.equal(res.ok, false)
    assert.equal(res.reason, 'bad-target')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('store: 执行成功后记成一批，可查询、可丢弃', async () => {
  const { createStore } = await import('../lib/src/store.mjs')
  const root = '/tmp/dc-org-root'
  const store = createStore()
  store.startScan(root)
  store.addEntry({ path: `${root}/a.txt`, name: 'a.txt', kind: 'file', bytes: 10, files: 1, latestModified: Date.now() })
  store.finishScan({ partial: false, scannedAt: Date.now(), reason: 'refresh', patterns: [], patternsTruncated: false })

  store.setOperation({ paths: [`${root}/a.txt`], to: '/tmp/dc-org-dst' })
  assert.equal(store.snapshot().plan.moveCount, 1)
  store.finishMoves({ results: [{ ok: true, from: `${root}/a.txt`, dest: '/tmp/dc-org-dst/a.txt' }] })

  const snap = store.snapshot()
  assert.equal(snap.plan.moveCount, 0)
  assert.equal(snap.operations[`${root}/a.txt`], undefined)
  assert.equal(snap.moveBatches.length, 1)
  const batch = store.moveBatch()
  assert.deepEqual(batch.items[0], { from: `${root}/a.txt`, to: '/tmp/dc-org-dst/a.txt', bytes: 10 })

  store.dropMoveBatch(batch.id)
  assert.equal(store.snapshot().moveBatches.length, 0)
})

test('executeMoves: 反向操作（只有 path/to、没有 op）也能执行', async () => {
  const root = await sandbox()
  try {
    // 先正向移动
    await executeMove(join(root, 'src', 'a.txt'), join(root, 'dst'))
    // 再反向：从 dst 移回 src
    const res = await executeMoves([{ path: join(root, 'dst', 'a.txt'), to: join(root, 'src') }])
    assert.equal(res[0].ok, true)
    assert.equal((await stat(join(root, 'src', 'a.txt'))).isFile(), true)
  } finally { await rm(root, { recursive: true, force: true }) }
})
