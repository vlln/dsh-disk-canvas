// 隔离区的读写契约：脚本写进去、插件列出来、还能移回原位。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseBatchTime, parseManifest, listQuarantine, restoreQuarantine, QUARANTINE_PREFIX } from '../lib/src/quarantine.mjs'

test('parseBatchTime: 从目录名解析时间，坏名字给 0', () => {
  const at = parseBatchTime('dsh-disk-canvas-20261019-011230')
  assert.ok(at > 0)
  const d = new Date(at)
  assert.equal(d.getMonth(), 9)
  assert.equal(d.getDate(), 19)
  assert.equal(parseBatchTime('random-dir'), 0)
  assert.equal(parseBatchTime('dsh-disk-canvas-oops'), 0)
})

test('parseManifest: 只认三列且路径是绝对路径', () => {
  const map = parseManifest([
    '001-a\t100\t/Users/me/a',
    '002-b\t200\t/Users/me/with space/b',
    'broken line',
    '003-c\t300\trelative/path',
    '',
  ].join('\n'))
  assert.equal(map.size, 2)
  assert.deepEqual(map.get('001-a'), { bytes: 100, path: '/Users/me/a' })
  assert.equal(map.get('002-b').path, '/Users/me/with space/b')
})

async function fakeHome() {
  const home = await mkdtemp(join(tmpdir(), 'dc-quar-'))
  const batch = join(home, '.Trash', `${QUARANTINE_PREFIX}20261019-011230`)
  await mkdir(batch, { recursive: true })
  await writeFile(join(batch, '001-Gone'), Buffer.alloc(1024))
  await writeFile(join(batch, '002-Gone2'), Buffer.alloc(2048))
  await writeFile(join(batch, 'manifest.tsv'), [
    '001-Gone\t1024\t' + join(home, 'restored', 'Gone'),
    '002-Gone2\t2048\t' + join(home, 'restored', 'Gone2'),
    '',
  ].join('\n'))
  return { home, batch }
}

test('listQuarantine: 读出批次、条数、体积与可恢复标记', async () => {
  const { home } = await fakeHome()
  try {
    const result = await listQuarantine({ home })
    assert.equal(result.batches.length, 1)
    const batch = result.batches[0]
    assert.equal(batch.count, 2)
    assert.equal(batch.bytes, 3072)
    assert.equal(batch.hasManifest, true)
    assert.equal(batch.entries.every((e) => e.restorable), true)
    assert.equal(batch.entries[0].path, join(home, 'restored', 'Gone'))
    assert.equal(result.count, 2)
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})

test('restoreQuarantine: 整批移回原位，再恢复一次报目标已存在', async () => {
  const { home, batch } = await fakeHome()
  try {
    const id = batch.split('/').pop()
    const first = await restoreQuarantine({ home, batch: id })
    assert.equal(first.restored, 2)
    assert.equal((await readdir(join(home, 'restored'))).length, 2)
    assert.equal((await readdir(batch)).join(','), 'manifest.tsv')

    const again = await restoreQuarantine({ home, batch: id })
    assert.equal(again.restored, 0)
    assert.notEqual(again.results[0].ok, true)
    assert.equal(['already', 'target-exists'].includes(again.results[0].reason), true)
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})

test('restoreQuarantine: 没有清单的批次拒绝恢复，坏批次名直接被挡', async () => {
  const home = await mkdtemp(join(tmpdir(), 'dc-quar2-'))
  try {
    const batch = join(home, '.Trash', `${QUARANTINE_PREFIX}20261018-000000`)
    await mkdir(batch, { recursive: true })
    await writeFile(join(batch, '001-X'), 'x')
    await assert.rejects(() => restoreQuarantine({ home, batch: `${QUARANTINE_PREFIX}20261018-000000` }), /no manifest/)
    await assert.rejects(() => restoreQuarantine({ home, batch: '../etc' }), /quarantine directory name/)
    const listed = await listQuarantine({ home })
    assert.equal(listed.batches[0].hasManifest, false)
    assert.equal(listed.batches[0].entries[0].restorable, false)
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})
