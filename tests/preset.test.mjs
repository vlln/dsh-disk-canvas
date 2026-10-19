// preset 的回归点：子插件的 Config 如果有 required 字段，漏写不会报错——
// 整个 preset 会挂载失败，然后从模式菜单里消失（设置页才显示「加载失败」）。
// 这里只守最容易踩的那个：tool-fs-search 的 sampleOverCapGlobResults。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('preset: tool-fs-search 必须显式给 sampleOverCapGlobResults', async () => {
  const text = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  assert.match(text, /id: preset-disk-cleanup/)
  assert.match(text, /name: '@deepseek-ai\/dsh-tool-fs-search'\n\s+config:\n\s+sampleOverCapGlobResults: (true|false)/)
})
