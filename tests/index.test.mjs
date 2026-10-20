// 标注索引：只收写过语义的目录，按类别分组，嵌套只留最上层。
import test from 'node:test'
import assert from 'node:assert/strict'
import { createStore } from '../lib/src/store.mjs'

const ROOT = '/tmp/dc-idx-root'
const entry = (path, bytes) => ({ path, name: path.split('/').pop(), kind: 'dir', bytes, files: 1, latestModified: Date.now() })

function seed() {
  const store = createStore()
  store.startScan(ROOT)
  store.addEntry(entry(`${ROOT}/a`, 1000))
  store.addEntry(entry(`${ROOT}/b`, 2000))
  store.finishScan({ partial: false, scannedAt: Date.now(), reason: 'refresh', patterns: [], patternsTruncated: false })
  store.setClaim({ path: `${ROOT}/a`, claim: '外层', category: 'project', label: '项目根' })
  store.setClaim({ path: `${ROOT}/a/vendor`, claim: '内层', category: 'deps' })
  store.setClaim({ path: `${ROOT}/b`, claim: '另一个', category: 'project' })
  store.setClaim({ path: `${ROOT}/outside`, claim: '不在当前层', category: 'project' })
  return store
}

test('labeledIndex: 按类别分组、嵌套只留最上层、未标注不收', () => {
  const store = seed()
  const groups = store.labeledIndex()
  const project = groups.find((g) => g.category === 'project')
  assert.equal(project.count, 3)
  const paths = project.items.map((it) => it.path)
  assert.ok(paths.includes(`${ROOT}/a`))
  assert.ok(!paths.includes(`${ROOT}/a/vendor`), '嵌套目录不重复出现')
  assert.equal(groups.find((g) => g.category === 'deps'), undefined, '内层被外层吸收后整类消失')
})

test('labeledIndex: 体积来自当前层，取不到就是 null', () => {
  const store = seed()
  const items = store.labeledIndex().flatMap((g) => g.items)
  assert.equal(items.find((it) => it.path === `${ROOT}/b`).bytes, 2000)
  assert.equal(items.find((it) => it.path === `${ROOT}/outside`).bytes, null)
})
